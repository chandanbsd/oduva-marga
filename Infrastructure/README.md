# Infrastructure

Podman Compose setup for running the full `oduva-marga` stack — Keycloak, Postgres,
the internal `oduva-marga-service`, `oduva-marga-bff`, and the Angular front-end —
on a single self-hosted VM (this was written against a Vultr VM, but nothing here
is Vultr-specific beyond the firewall step).

## Architecture

```
Internet ──▶ [PUBLIC_PORT] oduva-mage-front-end (nginx + Angular static)  ← only published port
                       │            │
                       │/auth/*     │/api/*
                       ▼            ▼
                   keycloak     oduva-marga-bff ──▶ oduva-marga-service
                       │                                   │
                       └───────────────┬───────────────────┘
                                        ▼
                                    postgres
                          (db: keycloak, db: oduva_marga_service)
```

`oduva-mage-front-end` is the **only** container that publishes a host port. Its
nginx serves the compiled Angular app and reverse-proxies `/auth/*` to Keycloak
and `/api/*` to the BFF, so the whole stack is reachable through one port and the
VM's firewall only needs one hole punched in it. All five containers share a
private Podman network (`oduva-net`) and resolve each other by service name.

Keycloak's login/token endpoints have to be public — the browser is redirected
there directly for the SPA's Authorization Code + PKCE flow — but everything
back-channel (token exchange, JWKS fetching) goes straight from the BFF to
`keycloak:8080` over the internal network, never through the public proxy.

## One-time VM setup

### 1. Install Podman and podman-compose

```sh
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y podman
pip3 install --user podman-compose

# Fedora/RHEL
sudo dnf install -y podman podman-compose
```

Run everything as a **non-root user** with rootless Podman configured — not root.

### 2. Clone the repo onto the VM

```sh
git clone <your-repo-url> oduva-marga
cd oduva-marga/Infrastructure
```

### 3. Create your `.env`

```sh
cp .env.example .env
```

Edit `.env` and fill in:
- `POSTGRES_PASSWORD` / `KEYCLOAK_ADMIN_PASSWORD` — generate real secrets, e.g. `openssl rand -base64 24`
- `PUBLIC_HOST` — the VM's public IP or domain name
- `PUBLIC_PORT` — the single port you'll expose (default `8080`)

`.env` is gitignored — it never leaves the VM.

### 4. Bring up Postgres and Keycloak first

Keycloak needs its database up before it can boot, and you need Keycloak running
before you can create a realm/client for the other services to reference:

```sh
podman-compose up -d postgres keycloak
podman-compose logs -f keycloak
```

Wait until the logs show Keycloak has started (`Running the server in development mode`
will *not* appear — we run `start`, not `start-dev`). Ctrl-C out of the log tail
once it's up. If your podman-compose version doesn't respect the healthcheck
`depends_on` condition, just wait for `podman ps` to show `postgres` as `healthy`
before starting `keycloak` manually.

### 5. Create the realm and client in Keycloak

Open `http://<PUBLIC_HOST>:<PUBLIC_PORT>/auth/admin` and log in with
`KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` from your `.env`.

1. **Create a realm**: top-left realm dropdown → *Create realm* → name it to match
   `KEYCLOAK_REALM` in your `.env` (default `oduva-marga`).
2. **Create a client for the Angular app**: *Clients* → *Create client*
   - Client ID: e.g. `oduva-mage-front-end`
   - Client type: `OpenID Connect`
   - Client authentication: **Off** (it's a public SPA client)
   - Authentication flow: **Standard flow** only (Authorization Code + PKCE)
   - Valid redirect URIs: `http://<PUBLIC_HOST>:<PUBLIC_PORT>/*`
   - Web origins: `http://<PUBLIC_HOST>:<PUBLIC_PORT>`
3. Save. You now have a realm and a client the Angular app can authenticate
   against — wiring the actual `angular-oauth2-oidc`/`angular-auth-oidc-client`
   config in the front-end is application work, not part of this IaC pass.

Optional, once you're happy with the realm: *Realm settings* → *Action* →
*Export* to save it as JSON. Drop it in `learn-keycloak/realm-export.json` if you
want a reproducible starting point for future rebuilds (not wired up yet — the
compose file always starts from a fresh, empty Keycloak on first boot).

### 6. Bring up the rest of the stack

```sh
podman-compose up -d
podman ps
```

You should see `oduva-postgres`, `oduva-keycloak`, `oduva-marga-service`,
`oduva-marga-bff`, and `oduva-mage-front-end` all running.

### 7. Open the firewall

On Vultr: **Products → your instance → Settings → Firewall**, attach or edit a
firewall group, and allow inbound TCP on whatever port you set as `PUBLIC_PORT`
(default `8080`). If the VM also runs `ufw` locally, mirror the same rule there:

```sh
sudo ufw allow 8080/tcp
```

Nothing else needs to be opened — Postgres, Keycloak's raw port, the service,
and the BFF are only reachable inside `oduva-net`.

## Verify end-to-end

```sh
# Front-end serves the Angular app
curl -sI http://<PUBLIC_HOST>:<PUBLIC_PORT>/ | head -1

# Keycloak is reachable through the proxy
curl -s http://<PUBLIC_HOST>:<PUBLIC_PORT>/auth/realms/<KEYCLOAK_REALM>/.well-known/openid-configuration | head -c 200

# BFF is reachable through the proxy
curl -s http://<PUBLIC_HOST>:<PUBLIC_PORT>/api/actuator/health

# Confirm the service and BFF have no published host ports
podman port oduva-marga-service
podman port oduva-marga-bff
```

The last two `podman port` commands should print nothing — that's confirmation
they're only reachable over the internal network.

## Redeploying after a code change

```sh
cd oduva-marga
git pull
cd Infrastructure
podman-compose up -d --build
```

This rebuilds only the images whose build context changed and recreates those
containers; Postgres and its volume are untouched.

## GitHub Actions (CI/CD) deploy

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs on a
**self-hosted GitHub Actions runner installed on the VM itself**. On every
push to `main` (or manual dispatch) it rebuilds and redeploys the whole stack
locally via `podman-compose` — no container registry or SSH keys required.

### 1. Register the VM as a self-hosted runner (if not already done)

In the repo: **Settings → Actions → Runners → New self-hosted runner**, then
run the generated commands on the VM, e.g.:

```sh
mkdir actions-runner && cd actions-runner
curl -o actions-runner.tar.gz -L <url-from-github>
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/<org>/oduva-marga --token <token-from-github>
sudo ./svc.sh install
sudo ./svc.sh start
```

Run the runner as the **same non-root user with rootless Podman configured**
used in the manual steps above — not root.

**Troubleshooting: `sudo ./svc.sh status` shows `status=203/EXEC` / "failed"**
On an SELinux-enforcing VM (Fedora/RHEL/Rocky/CentOS-family), this means
SELinux is blocking systemd from executing `runsvc.sh` because it's sitting
under a home directory (`user_home_t` context) — not a real permissions
problem, even though the error is literally "Permission denied". Confirm with
`sudo journalctl -u actions.runner.*.service --no-pager -n 20`, then fix by
giving the runner directory a context systemd is allowed to run:

```sh
sudo semanage fcontext -a -t bin_t "$HOME/actions-runner(/.*)?"
sudo restorecon -R -v "$HOME/actions-runner"
sudo ./svc.sh start
```

(`semanage` missing? `sudo dnf install -y policycoreutils-python-utils` first.)
See `INFRASTRUCTURE_DECISIONS.md`'s Gotchas section for the full diagnostic
trail. Debian/Ubuntu VMs (no SELinux by default) won't hit this.

### 2. Set the required repository configuration

The workflow builds `Infrastructure/.env` itself, fresh, on every run — from
GitHub repo **Variables** (non-secret config) and **Secrets** (passwords). It
never reads a `.env` file left on the runner's disk, so there's nothing to
manually keep in sync there.

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Name | Example |
|---|---|
| `PUBLIC_HOST` | the VM's public IP or domain |
| `PUBLIC_PORT` | `8080` |
| `POSTGRES_USER` | `oduva` |
| `POSTGRES_DB` | `keycloak` |
| `SERVICE_DB_NAME` | `oduva_marga_service` |
| `KEYCLOAK_ADMIN` | `admin` |
| `KEYCLOAK_REALM` | `oduva-marga` |

```sh
gh variable set PUBLIC_HOST --body "<your-vm-ip-or-domain>"
gh variable set PUBLIC_PORT --body "8080"
gh variable set POSTGRES_USER --body "oduva"
gh variable set POSTGRES_DB --body "keycloak"
gh variable set SERVICE_DB_NAME --body "oduva_marga_service"
gh variable set KEYCLOAK_ADMIN --body "admin"
gh variable set KEYCLOAK_REALM --body "oduva-marga"
```

**Secrets** (Settings → Secrets and variables → Actions → Secrets) — generate
real values yourself, e.g. `openssl rand -base64 24`; these are yours to set,
not something anyone should fill in on your behalf:

```sh
gh secret set POSTGRES_PASSWORD
gh secret set KEYCLOAK_ADMIN_PASSWORD
```

(`gh secret set NAME` without `--body` prompts you to paste the value
interactively, so it never ends up in your shell history.)

If any of these are missing, the workflow's "Validate required configuration
is set" step fails fast with exactly which ones are missing, instead of
silently deploying a broken stack.

### 3. First deploy still needs the manual Keycloak step once

CI builds and starts the containers, but it does **not** create the Keycloak
realm/client — that's still the one-time manual admin-console step above
(*"Create the realm and client in Keycloak"*). Do that once after the first
CI-driven deploy brings Keycloak up, the same as in the manual flow.

### What the workflow checks before calling a deploy healthy

Its smoke test hits the front-end root, `/api/actuator/health` (BFF), and
Keycloak's built-in `master` realm discovery document — deliberately not your
app realm (`KEYCLOAK_REALM`), since that realm doesn't exist yet on a brand
new environment's very first deploy, before step 3 above has been done by
hand. `master` always exists out of the box, so it still proves Keycloak
itself is genuinely healthy through the proxy without depending on manual
setup having already happened.

## Manual single-container verification

Same as before, useful when iterating on just the front-end:

```sh
cd oduva-mage-front-end
podman build -t oduva-mage-front-end:test .
podman run --rm -p 8080:80 oduva-mage-front-end:test
curl localhost:8080
```

## Notes

- **Backups**: all Postgres data (Keycloak's realm/users and the service's data)
  lives in the named volume `postgres-data`. Back it up with
  `podman run --rm -v postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data.tar.gz /data`,
  or `pg_dump` from inside the `oduva-postgres` container for a logical backup.
- **TLS**: this setup is plain HTTP. Once you point a real domain at the VM, put
  a TLS terminator (Caddy or nginx + certbot) in front of the published port —
  that's a follow-up step, not covered here.
- **Logs**: `podman-compose logs -f <service>` for any of the five service names
  above (e.g. `postgres`, `keycloak`, `oduva-marga-bff`).
