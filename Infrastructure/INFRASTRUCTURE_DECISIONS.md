# Infrastructure Decision Record

**Status:** Living document. This file is updated every time an infrastructure
decision is made, changed, reversed, or superseded — not just at creation time.

**Scope:** All IaC and directly adjacent setup for `oduva-marga`: container
topology, orchestration, networking, identity (Keycloak), the datastore,
build/deploy tooling, CI, and the minimal application-level config that exists
solely to let containers boot and be health-checked.

**Relationship to other docs:**
- [`Infrastructure/README.md`](README.md) is the **how** — install steps, bring-up
  order, verification commands, redeploy flow. Operational, task-oriented.
- This file is the **why** — the reasoning, alternatives considered, and
  trade-offs behind every non-obvious choice baked into that setup, plus a
  record of facts discovered by hands-on verification that would otherwise get
  silently rediscovered (or silently broken) by the next person or agent to
  touch this stack.
- [`/CLAUDE.md`](../CLAUDE.md) tells any Claude Code session working in this
  repo when and how to update this file. If you're an agent about to make an
  infrastructure change, read that file first.

**How to read this document:** each decision has an ID, a status, the context
that forced the decision, the decision itself, the alternatives that were
considered and why they were rejected, and the concrete consequences. The
"Implementation Notes & Verified Gotchas" section below the decision log
covers things that aren't really *decisions* (nobody chose them) but are load-
bearing facts discovered by actually building and running the stack — get one
of these wrong and the stack looks fine until it silently isn't.

---

## Index

| ID | Title | Status |
|----|-------|--------|
| [ID-001](#id-001-podman-over-docker) | Podman over Docker | Accepted |
| [ID-002](#id-002-five-container-topology-single-public-entrypoint) | Five-container topology, single public entrypoint | Accepted |
| [ID-003](#id-003-iac-scope-compose-only-no-terraform) | IaC scope: Compose only, no Terraform | Accepted |
| [ID-004](#id-004-shared-postgres-instance-two-databases) | Shared Postgres instance, two databases | Accepted |
| [ID-005](#id-005-bff-and-service-are-internal-only) | BFF and backend service are internal-only | Accepted |
| [ID-006](#id-006-keycloaks-full-public-surface-including-admin-console) | Keycloak's full public surface, including admin console | Accepted |
| [ID-007](#id-007-manual-keycloak-realmclient-setup-over-realm-export-json) | Manual Keycloak realm/client setup over realm-export JSON | Accepted |
| [ID-008](#id-008-application-code-stays-at-template-fidelity) | Application code stays at "template" fidelity | Accepted |
| [ID-009](#id-009-dockerfiles-use-the-repos-own-gradle-wrapper) | Dockerfiles use the repo's own Gradle wrapper | Accepted |
| [ID-010](#id-010-pinned-base-images) | Pinned base images | Accepted |
| [ID-011](#id-011-nginx-as-the-only-public-surface-path-based-reverse-proxy) | nginx as the only public surface, path-based reverse proxy | Accepted |
| [ID-012](#id-012-ci-generates-env-from-github-actions-secretsvariables-on-every-run) | CI generates `.env` from GitHub Actions Secrets/Variables on every run | Accepted |

---

## Architecture Snapshot

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

Five containers, one custom Podman bridge network (`oduva-net`), one published
host port. Orchestrated by [`Infrastructure/podman-compose.yml`](podman-compose.yml).

---

## Decisions

### ID-001: Podman over Docker

**Status:** Accepted

**Context:** The repo already had a partial `Infrastructure/podman-compose.yml`
(front-end only) and a README describing a Podman + self-hosted-GitHub-Actions-
runner deploy flow, before this expanded stack was designed. The user initially
asked for "docker containers," which is common generic phrasing for "containers"
rather than a literal engine requirement.

**Decision:** Keep Podman/podman-compose as the container engine and orchestrator,
matching the pre-existing pattern, rather than migrating to Docker Engine +
Docker Compose.

**Alternatives considered:**
- *Switch to Docker*: would have meant installing Docker Engine on the VM
  alongside/instead of Podman, rewriting the existing self-hosted-runner deploy
  assumptions, and abandoning rootless-by-default operation for no functional
  gain — nothing in the requirements needs Docker specifically.

**Consequences:**
- All compose files are `podman-compose.yml`, invoked with `podman-compose` /
  `podman build`, not `docker compose` / `docker build`. Syntax is
  Compose-spec-compatible so this is mostly a non-issue, but tooling,
  healthcheck shell behavior, and image-pull behavior were all verified against
  Podman specifically (see Gotchas below) — do not assume Docker parity without
  re-verifying.
- Rootless operation is preserved: the deploy runner should run as a non-root
  user with rootless Podman configured, not root.

**Why the deploy workflow needs no SSH keys or registry — the self-hosted
runner's network model:** the GitHub Actions runner agent runs directly on
the VM itself (installed per `Infrastructure/README.md`'s runner-registration
steps), not on GitHub's infrastructure. It holds an **outbound** connection
*from* the VM *to* GitHub (long-poll to `github.com`/`*.actions.githubusercontent.com`),
registering itself as available for jobs tagged `runs-on: self-hosted`. On a
push to `main`, GitHub dispatches the job over that existing outbound
connection — it never initiates an inbound connection to the VM. The workflow
then runs as ordinary local commands (checkout, `podman-compose build/up`)
directly on the VM's own filesystem. There is no "reach the VM" step to
provision: the code that deploys is already running where it needs to deploy.
Consequences worth being deliberate about:
- **No inbound port is needed for CI at all** — only `PUBLIC_PORT` (end users
  reaching the deployed app) needs an inbound firewall rule; nothing
  GitHub-Actions-related does.
- **Outbound HTTPS (443) from the VM to GitHub's domains must work** for the
  runner to poll for jobs and stream logs back — default on most VMs, but
  worth checking if the Vultr firewall group ever gets egress rules added.
- **Trust boundary**: the runner executes workflow code with the same local
  privileges as whatever user it runs as (see the non-root point above) —
  anyone who can get a workflow to run has effectively got code execution on
  the VM. This workflow triggers only on `push` to `main` and
  `workflow_dispatch`, not on pull requests, so that's scoped to people with
  push access to `main`, not arbitrary fork PRs — but it's worth keeping in
  mind now that real secrets (`POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`,
  see ID-012) flow through this same runner.

---

### ID-002: Five-container topology, single public entrypoint

**Status:** Accepted

**Context:** The user asked for "Keycloak in one container, BFF+Angular in
another, and another container" — ambiguous on exact count and on whether
BFF+Angular meant one container or two. Clarified via direct questions.

**Decision:** Five containers: `postgres`, `keycloak`, `oduva-marga-service`
(internal-only), `oduva-marga-bff` (internal-only), `oduva-mage-front-end`
(the **only** container with a published host port). The front-end's nginx
reverse-proxies to Keycloak and the BFF, so the whole stack is reachable
through one port.

**Alternatives considered:**
- *One combined BFF+Angular container* (single image running both nginx and
  the BFF process via a supervisor): rejected — independent restart/scaling/
  logs for the BFF vs. the static asset server, and the front-end already had
  a working standalone Dockerfile worth preserving.
- *oduva-marga-service and BFF each get published host ports*: rejected in
  favor of the single-entrypoint model — see ID-005.
- *Separate Postgres containers per consumer* (postgres-keycloak,
  postgres-service): rejected — see ID-004.

**Consequences:**
- Only one VM firewall rule needed (`PUBLIC_PORT`, default 8080).
- Every inter-service call not meant for a browser goes over the internal
  `oduva-net` bridge network, never through the public proxy.
- Adding a sixth service later means deciding: does it need public exposure
  (add an nginx location block) or is it internal-only (no published port,
  just added to `oduva-net`)? Default to internal-only unless a browser needs
  to reach it directly.

---

### ID-003: IaC scope: Compose only, no Terraform

**Status:** Accepted

**Context:** The user already owns and manages a Vultr VM; it is not being
provisioned by this project.

**Decision:** IaC scope is the container stack — Compose file(s), Dockerfiles,
env wiring — and stops there. No Terraform (or other tool) manages the VM
itself, its firewall, or DNS.

**Alternatives considered:**
- *Terraform with the Vultr provider* to manage the VM, firewall group, and
  DNS records as code: rejected for now as out of scope — the VM already
  exists and firewall/DNS changes are infrequent, manual, one-VM operations
  that don't currently justify a second IaC tool and state file. Revisit if the
  VM ever needs to be reproducible (disaster recovery, multiple environments).

**Consequences:**
- Firewall port-opening is a manual step in `Infrastructure/README.md`, not
  code.
- If this ever needs to scale to multiple environments or VMs, this decision
  should be revisited first — see Open Questions.

---

### ID-004: Shared Postgres instance, two databases

**Status:** Accepted

**Context:** Both Keycloak and `oduva-marga-service` need a relational
database. The BFF currently needs none.

**Decision:** One `postgres` container, one instance, two databases created on
first boot (`keycloak`, `oduva_marga_service`) — the second created by
[`Infrastructure/postgres/init-multiple-dbs.sh`](postgres/init-multiple-dbs.sh)
mounted into `/docker-entrypoint-initdb.d/` (the official Postgres image only
auto-creates the one database named by `POSTGRES_DB`).

**Alternatives considered:**
- *Separate Postgres container per consumer*: simpler isolation, but doubles
  the memory/operational footprint on a single small VM for no isolation
  benefit at this scale (one operator, one VM, no multi-tenant compliance
  requirement driving DB-level isolation).

**Consequences:**
- Both databases share Postgres's resource limits and one restart domain — if
  Postgres goes down, both Keycloak and the service go down together. Acceptable
  trade-off for a single-VM deployment; revisit if either workload needs
  independent scaling or maintenance windows.
- Backups are simpler (one volume, one `pg_dump`/`tar` covers everything) —
  see `Infrastructure/README.md`'s Notes section.
- `SERVICE_DB_NAME` and `POSTGRES_DB` must stay distinct or the init script's
  `CREATE DATABASE` will collide with the auto-created one.

---

### ID-005: BFF and backend service are internal-only

**Status:** Accepted

**Context:** `oduva-marga-bff` calls `oduva-marga-service`; the question was
whether the browser (or anything outside the VM) should ever reach
`oduva-marga-service` directly, and whether the BFF itself needs a published
port independent of the front-end's proxy.

**Decision:** `oduva-marga-bff` calls `oduva-marga-service` internally only.
Neither container publishes a host port; both are reachable exclusively over
`oduva-net` by service name (`http://oduva-marga-service:8082`,
`http://oduva-marga-bff:8081`). The BFF is reached from outside only via the
front-end's `/api/` nginx proxy.

**Alternatives considered:**
- *Both BFF and service exposed publicly* (their own ports/routes): rejected —
  no current client needs to call `oduva-marga-service` directly, and every
  additional publicly-reachable service is attack surface and one more
  firewall rule to maintain.

**Consequences:**
- `oduva-marga-service` has zero public attack surface — verified via
  `podman port oduva-marga-service` returning nothing (see Gotchas).
- If a future client legitimately needs to call `oduva-marga-service`
  directly, that's a topology change requiring a new decision entry here, not
  a silent `ports:` addition.

---

### ID-006: Keycloak's full public surface, including admin console

**Status:** Accepted

**Context:** Directly asked by the user: "why is Keycloak exposed to the
public? Can it be private to the BFF and not reachable from outside?"

**Decision:** Keycloak sits behind the same public nginx proxy as everything
else, at `/auth/*`, with **no** special carve-out to hide the admin console
(`/auth/admin`) from the public path. The admin console's only protection is
the `KEYCLOAK_ADMIN_PASSWORD` credential, not network isolation.

**Alternatives considered:**
- *Public login/token endpoints, admin console locked down* (proxy only the
  realm/protocol/well-known paths; require an SSH tunnel or `podman exec` for
  `/auth/admin`): this was the recommended option, offered explicitly to the
  user. **Rejected by the user** in favor of simplicity.
- *Fully private Keycloak via a password-grant-through-BFF pattern* (Angular
  submits credentials to the BFF, which forwards them to Keycloak's token
  endpoint server-to-server; no browser-Keycloak contact at all): rejected —
  the OAuth2 spec explicitly discourages the Resource Owner Password
  Credentials grant outside trusted legacy cases, it means the BFF handles raw
  passwords instead of Keycloak, and it forecloses MFA/social login/passkeys
  later.

**Why full privacy isn't even possible with standard browser login:** the
Angular SPA uses Authorization Code + PKCE, which requires the **browser** —
not just the BFF — to be redirected to Keycloak's login page and back. That
front-channel traffic has to be internet-reachable no matter what; there is no
configuration that makes Keycloak's login/token endpoints BFF-only while
keeping standard federated login. What genuinely *can* stay private —and
does— is the back-channel: token exchange and JWKS fetching go straight from
the BFF to `keycloak:8080` over `oduva-net`, never through the public proxy.

**Consequences:**
- The Keycloak admin login form is internet-reachable. Its only defense is the
  admin password — treat `KEYCLOAK_ADMIN_PASSWORD` with the same care as a
  root credential, rotate it if ever suspected leaked, and consider revisiting
  this decision (add an IP allowlist in nginx, or a separate SSH-tunnel-only
  path) if the admin console is ever a target of automated scanning in
  practice.
- If this needs to change later (lock down `/auth/admin` specifically), it's a
  targeted nginx `location` change — split `/auth/admin` into its own block
  with an `allow`/`deny` list or auth_basic gate, rather than removing the
  proxy path entirely.

---

### ID-007: Manual Keycloak realm/client setup over realm-export JSON

**Status:** Accepted

**Context:** `learn-keycloak/` exists as an empty placeholder — the user is
using this project partly to learn Keycloak hands-on.

**Decision:** The realm and the Angular SPA client are created by hand through
the Keycloak admin console, walked through step-by-step in
`Infrastructure/README.md`, rather than shipping a pre-authored
`realm-export.json` imported automatically via `--import-realm`.

**Alternatives considered:**
- *Pre-authored realm-export JSON, auto-imported on boot*: more reproducible
  and more "IaC-pure" (the realm becomes code, not admin-console clicks), but
  rejected for the initial pass — it would black-box exactly the tool the user
  is trying to learn, and hand-authored Keycloak realm JSON is easy to get
  subtly wrong (schema drifts between versions) without a real admin console
  to validate against first.

**Consequences:**
- Every fresh `postgres-data` volume (e.g. after `podman-compose down -v`)
  means the realm and client must be recreated by hand again — there is
  currently no reproducible one-command way to stand up a fully-configured
  Keycloak.
- **Deferred, not rejected**: once the realm is stable, export it (*Realm
  settings → Action → Export*) to `learn-keycloak/realm-export.json` and wire
  it into the compose file's Keycloak service via `--import-realm` + a bind
  mount. This is explicitly flagged as future work, not forgotten scope — see
  Open Questions.

---

### ID-008: Application code stays at "template" fidelity

**Status:** Accepted

**Context:** `oduva-marga-bff` and `oduva-marga-service` were bare Spring Boot
skeletons (no web starter, no Dockerfile) when this work started. Explicit
user direction mid-task: *"the application code is just a guideline... our
priority is to setup the IaC first, the application code right now is nothing
but templates."*

**Decision:** Application code changes are limited to the minimum needed for
each container to boot as an HTTP service and answer a health check:
`spring-boot-starter-web`, `spring-boot-starter-actuator` (both apps),
`runtimeOnly 'org.postgresql:postgresql'` (service only), `server.port` and
`management.endpoint.health` config in `application.yaml`, and a
`spring.datasource.*` block on the service so the container has something to
connect the injected env vars to. No security, JPA/persistence, or business
logic was added.

**Alternatives considered:**
- *Fully wire the BFF's OAuth2 resource-server config* (validate JWTs issued
  by Keycloak, matching issuer/JWK-set behavior): explicitly deferred. The
  compose file already injects `OIDC_ISSUER_URI` and `OIDC_JWK_SET_URI` env
  vars, and `oduva-marga-bff`'s `application.yaml` binds them under a
  placeholder `oduva.oidc.*` namespace — but nothing in the app currently
  reads them. This is intentional: the values are ready and waiting; the
  actual `spring-boot-starter-oauth2-resource-server` dependency and security
  config are application work for later, not part of this IaC pass.

**Consequences:**
- The `oduva.*` block in `oduva-marga-bff/src/main/resources/config/application.yaml`
  is **not** a real Spring property namespace — it's documentation-as-config,
  a label pointing at env vars that already land in Spring's `Environment`
  with or without it. Don't assume anything currently binds to it.
- Two **pre-existing, unrelated bugs** were fixed in application source purely
  because they blocked verifying the Dockerfiles actually build/boot — not as
  application feature work. See Gotchas below; this line exists so it's clear
  why source files were touched at all under a "no app logic" decision.

---

### ID-009: Dockerfiles use the repo's own Gradle wrapper

**Status:** Accepted

**Context:** Both `oduva-marga-bff` and `oduva-marga-service` need multi-stage
container builds (Gradle 9.5.1 / Java 25 toolchain, per their
`gradle-wrapper.properties` and `build.gradle`).

**Decision:** The builder stage runs on an `eclipse-temurin:25-jdk-alpine`
base image and invokes the project's own `./gradlew bootJar --no-daemon` —
it does **not** use a `gradle:<version>` base image.

**Alternatives considered:**
- *`gradle:9.5.1-jdk25` base image*: would need to track the exact Gradle
  version the wrapper specifies in a second place (the Dockerfile's `FROM`
  line) and keep it in lockstep with `gradle-wrapper.properties` by hand.
  Using the wrapper itself means the Dockerfile only needs a JDK, and the
  wrapper downloads the exact pinned Gradle version on first build —
  one source of truth for the Gradle version, not two.

**Consequences:**
- First build inside a fresh image layer pays the wrapper's one-time Gradle
  download cost; cached in the builder layer on subsequent builds as long as
  the layer cache survives.
- If `gradle-wrapper.properties` is ever bumped, the Dockerfile needs no
  change — it will just pull whatever version the wrapper now points at.

---

### ID-010: Pinned base images

**Status:** Accepted

**Decision:** No `latest` tags anywhere in the stack, and every reference is
**fully registry-qualified** (not just tag-pinned — see the short-name
resolution Gotcha below for why the registry prefix is load-bearing, not
cosmetic):
- `docker.io/library/postgres:16-alpine`
- `quay.io/keycloak/keycloak:26.0`
- `docker.io/library/eclipse-temurin:25-jdk-alpine` (build stage) /
  `docker.io/library/eclipse-temurin:25-jre-alpine` (runtime stage)
- `docker.io/library/nginx:1.27-alpine` (pre-existing, front-end runtime stage)
- `docker.io/library/node:20-alpine` (pre-existing, front-end build stage)

**Context:** Standard IaC reproducibility practice — `latest` drifts silently
between builds and between the VM and any local/dev machine.

**Consequences:** Version bumps are deliberate, single-line changes to
`podman-compose.yml` or a `Dockerfile`, not surprises picked up on a rebuild.
Availability of the `25-jdk-alpine`/`25-jre-alpine` Eclipse Temurin tags was
explicitly verified against the Docker Hub API before pinning them (see
Gotchas) — Java 25 alpine tags were not a safe assumption going in. The
registry-qualification part of this decision was **not** part of the original
design — it was added after a real CI failure (see Gotchas: "Podman's
enforcing short-name resolution...") showed that tag-pinning alone isn't
enough; without an explicit registry, Podman still has to resolve which
registry an unqualified name like `postgres:16-alpine` means, and that
resolution step itself can fail outright in a non-interactive context.

---

### ID-011: nginx as the only public surface, path-based reverse proxy

**Status:** Accepted

**Decision:** `oduva-mage-front-end`'s nginx does double duty: serves the
built Angular app at `/`, and reverse-proxies `/auth/` → `keycloak:8080` and
`/api/` → `oduva-marga-bff:8081/`. See
[`oduva-mage-front-end/nginx.conf`](../oduva-mage-front-end/nginx.conf).

**Alternatives considered:**
- *A dedicated 6th reverse-proxy/gateway container* (e.g. a standalone nginx
  or Caddy just for routing): rejected — would add a container and a hop for
  no behavior nginx-serving-the-SPA can't already do, since that container was
  going to run nginx anyway.
- *Subdomain-based routing* (`auth.example.com`, `api.example.com`) instead of
  path-based: rejected for now — requires DNS records and complicates the
  "one VM, one IP, one port" story this setup optimizes for. Would also need
  CORS configuration that path-based same-origin routing avoids entirely.

**Consequences:**
- Same-origin: the Angular app, its `/api` calls, and the Keycloak redirect
  all share one origin from the browser's point of view — no CORS
  configuration needed anywhere in this stack.
- `KC_HTTP_RELATIVE_PATH=/auth` on the Keycloak container is load-bearing for
  this to work — see Gotchas, this couples directly to the `/auth/` nginx
  location block and to `KC_HOSTNAME`.

---

### ID-012: CI generates `.env` from GitHub Actions Secrets/Variables on every run

**Status:** Accepted

**Context:** `.github/workflows/deploy.yml` already existed before the
5-container stack was designed (it predates this repo becoming a live git
checkout in this working session — see Changelog). It only ever covered the
old single-container front-end deploy and never created or referenced a
`.env` file at all. With every service now depending on `.env`-sourced
variables with no defaults in `podman-compose.yml`, the workflow would fail
outright. The obvious fix — manually place a `.env` on the runner once, like
the manual VM flow in this README — has a sharp edge: `actions/checkout@v4`
defaults to `clean: true`, which runs `git clean -ffdx` and deletes untracked,
gitignored files (including `.env`) from the workspace on every run. This was
originally flagged as an **unverified risk** in this document's Open
Questions.

**Decision:** The workflow writes `Infrastructure/.env` fresh on every run,
from GitHub repository **Variables** (`vars.*`, non-secret config:
`PUBLIC_HOST`, `PUBLIC_PORT`, `POSTGRES_USER`, `POSTGRES_DB`,
`SERVICE_DB_NAME`, `KEYCLOAK_ADMIN`, `KEYCLOAK_REALM`) and **Secrets**
(`secrets.*`: `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`), mapped to
job-level `env:` first and referenced as shell variables (`$POSTGRES_PASSWORD`)
rather than interpolating `${{ secrets.* }}` directly into `run:` script
strings — matching GitHub's own guidance for handling secrets safely in shell
steps. A "Validate required configuration is set" step runs first and fails
fast, listing exactly which Variables/Secrets are missing, rather than
deploying with silently-blank values.

**Alternatives considered:**
- *`clean: false` on checkout + a manually-persisted `.env` on the runner*:
  simpler diff, but fragile — breaks silently the moment the workspace is
  ever cleaned for any other reason (a different workflow, manual runner
  maintenance, a runner re-registration), with a failure mode that's just
  "every service loses its config" rather than a clear error.
- *Store the whole `.env` file as one GitHub Secret (base64-encoded blob)*:
  rejected — opaque (can't tell what changed in a diff or audit log when one
  value is updated), and mixes clearly-non-secret config (`PUBLIC_PORT`) in
  with actual passwords for no benefit.

**Consequences:**
- No dependency on runner disk state persisting between runs at all — a
  totally fresh runner workspace works identically to one that's run a
  hundred deploys.
- Adding a new required env var to the stack means updating it in three
  places: `podman-compose.yml`'s `environment:` block, this workflow's
  job-level `env:` + validation list + `.env` heredoc, and
  `Infrastructure/README.md`'s CI section table. No single source of truth
  for "the list of required config" currently exists across manual and CI
  deploy paths — worth a helper script or shared env-var manifest if this
  list keeps growing.
- `.env` is `chmod 600`'d after being written, and no workflow step ever
  `cat`s or echoes it — avoid adding a debug step that dumps it, since
  GitHub's secret-masking only redacts values it knows are secrets, not
  arbitrary file contents that happen to contain them verbatim.

---

## Implementation Notes & Verified Gotchas

These aren't decisions — nobody chose them — they're facts pinned down by
actually building and running the stack locally with Podman before writing
them into the README as if they were known-good. Get any of these wrong and
the stack looks like it's working right up until it isn't.

### Keycloak: `start`, not `start --optimized`

`command: start --optimized` on the stock `quay.io/keycloak/keycloak` image
crash-loops with `ERROR: The '--optimized' flag was used for first ever server
start. Please don't use this flag for the first startup or use 'kc.sh build'
to build the server first.` `--optimized` assumes the image was already built
via `kc.sh build` (typically baked into a custom Dockerfile at image-build
time). Since this setup runs the stock image directly with runtime env vars,
`podman-compose.yml` uses plain `command: start`.

### Keycloak's image has no `curl` or `wget`

The official Keycloak image (UBI-based) ships neither. A `curl -f ...`
healthcheck fails immediately and permanently — not with a clear "command not
found" surfaced anywhere obvious, just a container stuck at `starting` /
`unhealthy` forever. Confirmed present in the image: `bash`, and `sh` is a
symlink to `bash`, so **`/dev/tcp` works via `CMD-SHELL`**. The working
healthcheck in `podman-compose.yml`:

```
exec 3<>/dev/tcp/127.0.0.1/9000 && printf 'GET /auth/health/ready HTTP/1.1\r\nhost: localhost\r\nConnection: close\r\n\r\n' >&3 && cat <&3 | grep -q '"status": "UP"'
```

### Keycloak's health endpoint is also prefixed by `KC_HTTP_RELATIVE_PATH`

With `KC_HTTP_RELATIVE_PATH=/auth` set, the health endpoint on the management
port (9000) moves from `/health/ready` to **`/auth/health/ready`** — the
relative path applies to the management interface too, not just the main
traffic port. Confirmed by probing `/health`, `/q/health`, and `/` on port
9000 directly inside the container; `/` returned `302 → /auth`, which is what
gave this away.

### `KC_HOSTNAME` must include the relative path itself (Keycloak 26 "hostname v2")

Setting `KC_HOSTNAME: http://${PUBLIC_HOST}:${PUBLIC_PORT}` (no `/auth` suffix)
produced a working proxy (requests still routed correctly, because nginx
forwards the full original `/auth/...` URI unchanged — see ID-011) but a
**broken issuer**: the OIDC discovery document came back with
`"issuer":"http://localhost:8080/realms/master"` — missing `/auth` entirely.
That would have broken JWT `iss` validation the moment the BFF's resource
server started checking it, in a way that would look correct in every proxy
test and only fail on real token validation. Fixed by setting
`KC_HOSTNAME: http://${PUBLIC_HOST}:${PUBLIC_PORT}/auth` — verified the
discovery document's `issuer` and `authorization_endpoint` both include `/auth`
after the fix. Lesson: when `KC_HOSTNAME` is a full URL (Keycloak 26's default
"hostname v2" behavior), it becomes the literal base for every generated
front-channel URL — Keycloak does **not** automatically append
`KC_HTTP_RELATIVE_PATH` on top of an explicit hostname URL.

### `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` are deprecated

Keycloak 26 logs `KC-SERVICES0110: Environment variable 'KEYCLOAK_ADMIN' is
deprecated, use 'KC_BOOTSTRAP_ADMIN_USERNAME' instead` (and the password
equivalent). Still functional, but `podman-compose.yml` uses the current
names (`KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD`) to avoid
carrying a deprecation forward from day one.

### Podman honors `.dockerignore`, but `.containerignore` wins if both exist

Verified empirically (not from documentation) with a throwaway build: with
only `.dockerignore` present, Podman excludes exactly what it lists — same
behavior as Docker. If a `.containerignore` is *also* present in the same
build context, Podman uses **only** `.containerignore`'s rules; it does not
merge the two, and `.dockerignore` is silently ignored in that case. This repo
currently has no `.containerignore` files anywhere, so the `.dockerignore`
files added for `oduva-marga-bff` and `oduva-marga-service` (plus the
pre-existing one for `oduva-mage-front-end`) are the effective ignore rules —
but if anyone ever adds a `.containerignore` alongside one of these, remember
it fully replaces the `.dockerignore`, not supplements it.

### Two pre-existing application bugs blocked container verification

Discovered only because the Dockerfiles were actually built and run, not just
written:
- `oduva-marga-bff/src/main/java/.../OduvaMargaBffApplication.java` called
  `SpringAppliction.run(...)` — typo'd class name, wouldn't compile. Fixed to
  `SpringApplication`.
- Both `OduvaMargaBffApplication.java` and `OduvaMargaApplication.java` (the
  service) declared `static void main(String[] args)` without `public` — the
  JVM launcher (`java -jar app.jar`) cannot find a non-public `main` method,
  so even a successful compile would have failed at container runtime with
  "Main method not found." Fixed both to `public static void main`.

These were fixed only because they blocked verifying ID-009/ID-010 actually
work end-to-end — they are not application feature work, and finding them is
exactly why "verify by actually building and running it" is part of how this
document's decisions get validated before being written down as fact.

### `application.yaml`: what's load-bearing vs. what's a placeholder

- `server.port`, `management.endpoints.web.exposure.include: health`, and
  `management.endpoint.health.probes.enabled` (both apps) are real, active
  Spring Boot configuration — verified via live `/actuator/health` calls
  through the proxy and directly over `oduva-net`.
- `spring.datasource.*` (service only) is real, active configuration —
  `DataSourceAutoConfiguration` reads exactly these property names; verified
  by the service starting cleanly and answering a health check backed by an
  actual Postgres connection.
- `oduva.service-base-url` / `oduva.oidc.issuer-uri` / `oduva.oidc.jwk-set-uri`
  (BFF only) are **not** real Spring properties consumed by anything yet —
  see ID-008. Removing this block would change nothing at runtime today; it
  exists purely to document where those env vars are meant to be picked up
  once the BFF's security config is built.

---

### CI smoke test checks the `master` realm, not `KEYCLOAK_REALM`

The app realm (`KEYCLOAK_REALM`, e.g. `oduva-marga`) is created by hand
through the admin console (ID-007) — it does not exist yet on a brand-new
environment's very first CI-driven deploy, before that manual step has been
done. Checking `/auth/realms/${KEYCLOAK_REALM}/.well-known/openid-configuration`
in the smoke test would 404 and fail an otherwise-successful first deploy.
Keycloak's built-in `master` realm always exists out of the box, so the
smoke test checks `/auth/realms/master/.well-known/openid-configuration`
instead — still proves Keycloak is genuinely healthy and correctly proxied,
without coupling CI health-checking to manual setup having already happened.

### Self-hosted runner service fails with `status=203/EXEC` on SELinux-enforcing VMs

On a VM with SELinux enforcing (Fedora/RHEL/Rocky/CentOS-family — confirmed on
this deployment's own VM), `sudo ./svc.sh install && sudo ./svc.sh start`
installs and starts the systemd unit without error, but the service
immediately fails:

```
Main PID: ... (code=exited, status=203/EXEC)
```

`journalctl -u <service>` shows the real reason, which the truncated default
`systemctl status` output hides:

```
Unable to locate executable '/home/<user>/actions-runner/runsvc.sh': Permission denied
```

This is **not** a real Unix permissions problem — `ls -la runsvc.sh` shows
correct ownership and `-rwxr-xr-x`. It's SELinux: anything under a home
directory defaults to the `user_home_t` context, and systemd-launched
services aren't permitted to execute files with that context, regardless of
the Unix mode bits. Two independent signals confirm this before ever running
`getenforce`: `sudo ./svc.sh install`'s own output includes a line like
`Relabeled .../actions.runner....service from unconfined_u:object_r:user_home_t:s0
to unconfined_u:object_r:systemd_unit_file_t:s0` (systemd relabeling the *unit
file*, proving SELinux is active and enforcing relabeling on this host), and
`ls -la runsvc.sh` shows a trailing `.` after the permission bits
(`-rwxr-xr-x.`), which is `ls`'s way of indicating the file carries an SELinux
context worth inspecting.

**Fix** — give the runner directory a context systemd is allowed to execute,
as a persistent policy rule (not a one-off relabel that a future `restorecon`
or reinstall would undo):

```sh
sudo semanage fcontext -a -t bin_t "/home/<user>/actions-runner(/.*)?"
sudo restorecon -R -v /home/<user>/actions-runner
sudo ./svc.sh start
```

(`semanage` may need installing first: `sudo dnf install -y policycoreutils-python-utils`.)

This only bites VMs with SELinux enforcing — a Debian/Ubuntu VM (no SELinux by
default) would install and start the same runner without hitting this at all.
Worth checking `getenforce` up front on any new VM before troubleshooting a
runner service failure as if it were a generic permissions issue.

### Podman's enforcing short-name resolution breaks unqualified image pulls with no TTY

The very first real CI-driven deploy on the VM failed at the build step with:

```
Error: creating build container: short-name resolution enforced but cannot prompt without a TTY
```

and, during the preceding pull step:

```
Error: short-name resolution enforced but cannot prompt without a TTY
Trying to pull quay.io/keycloak/keycloak:26.0...
```

**Root cause:** every `FROM`/`image:` reference in this stack was written as a
short name — `postgres:16-alpine`, `eclipse-temurin:25-jdk-alpine`,
`node:20-alpine`, `nginx:1.27-alpine` — with no registry prefix. Podman's
default `short-name-mode` is `enforcing`: if it can't be certain which
registry an unqualified name refers to, it normally prompts interactively
("did you mean `docker.io/library/postgres`?"). A systemd-run self-hosted
runner has no TTY to prompt on, so instead of guessing it just fails outright.
`quay.io/keycloak/keycloak:26.0` was unaffected because it was already fully
qualified — the pull step's error line belongs to the `postgres` pull that
ran immediately before it in the same step, not to Keycloak.

**Why this wasn't caught by this document's own "verify before you write it
down" rule during the original local Podman testing** (see the top-level
Verification section of the original build-out): the local machine used for
that verification either already had these exact image layers cached from
earlier ad-hoc `podman build`/`podman pull` calls, or its Podman install has a
more permissive short-name configuration than the VM's. Either way, it masked
the defect rather than exercising the real failure path — the very same thing
that happened again on the VM itself: the front-end's `node:20-alpine` and
`nginx:1.27-alpine` layers were already cached locally from earlier manual
testing on that VM and built fine via cache in the same failing run, while
`eclipse-temurin:25-jdk-alpine` (never previously pulled on that VM) hit the
error. **Lesson: a short-name image reference "working" is not evidence it's
correctly qualified — it may just mean the layer was already cached
somewhere.** The only reliable way to know is to fully qualify every
reference, or to test on a machine with no prior cache and no TTY.

**Fix:** fully qualify every base image and compose `image:` reference with
its registry (`docker.io/library/<name>` for Docker Official Images —
confirmed via the Docker Hub API, the same method used to verify tag
availability for ID-010 — `quay.io/...` for anything already on Quay, etc.),
rather than relying on Podman to resolve an unqualified name. Applied to
`Infrastructure/podman-compose.yml` (`postgres`) and all three Dockerfiles
(`eclipse-temurin` ×2 in both `oduva-marga-bff` and `oduva-marga-service`,
`node` and `nginx` in `oduva-mage-front-end`). Re-verified locally after the
fix (`podman-compose config` + a full `podman build` of the BFF image) before
this was written down — **not yet re-verified against an actual CI run on the
VM** at the time this entry was written; confirm on the next push.

## Open Questions / Deferred Work

- **TLS**: this stack is plain HTTP end-to-end. Once a real domain points at
  the VM, a TLS terminator (Caddy, or nginx + certbot) needs to sit in front
  of `PUBLIC_PORT`. Not started.
- **Keycloak realm reproducibility**: see ID-007 — export the hand-configured
  realm to `learn-keycloak/realm-export.json` and wire `--import-realm` into
  the compose file once the realm design has stabilized.
- **BFF OAuth2 resource-server wiring**: `OIDC_ISSUER_URI` / `OIDC_JWK_SET_URI`
  are injected and waiting (see ID-008) but nothing validates JWTs yet.
- ~~**CI workflow (`.github/workflows/deploy.yml`) and `.env` on the runner**~~
  — **Resolved by ID-012.** The workflow now generates `.env` fresh from
  GitHub Actions Variables/Secrets on every run, so the `actions/checkout`
  clean-wipe risk no longer applies (there's no persisted file to wipe).
  Still genuinely untested end-to-end against a real self-hosted runner and
  VM from this environment — the workflow's shell logic and YAML were
  verified locally (bash validation-loop tested with dummy env vars; YAML
  parse-checked), but an actual triggered run has not been observed. Verify
  on the first real push after wiring up the repo Variables/Secrets per
  `Infrastructure/README.md`.
- **Terraform for the VM/firewall/DNS layer**: explicitly out of scope per
  ID-003; revisit if reproducibility across environments becomes a
  requirement.

---

## Changelog

- **2026-08-06 (6)** — Bumped `actions/checkout` from `@v4` to `@v7` in
  `.github/workflows/deploy.yml` (verified via the GitHub API that `v7`
  declares `runs.using: node24`, vs. `v4`'s `node20`) — resolves the "Node 20
  is being deprecated" warning seen in the CI log during the short-name
  resolution debugging above. Routine version bump, not a design decision;
  noted here only for the audit trail.
- **2026-08-06 (5)** — Fixed the first real CI-driven build failure on the VM:
  every base image reference (`postgres`, `eclipse-temurin` ×2, `node`,
  `nginx`) was an unqualified short name, which Podman's enforcing
  short-name-resolution mode can't resolve without a TTY to prompt on —
  fatal in the self-hosted runner's non-interactive systemd context. Fully
  qualified all of them with their registry
  (`docker.io/library/...`/`quay.io/...`) in `Infrastructure/podman-compose.yml`
  and all three Dockerfiles; re-verified locally (compose config + a full
  `podman build`) before writing this up. ID-010 amended in place (not
  reversed) to reflect that "pinned" now also means registry-qualified, with
  a new Gotcha entry explaining the failure mode and why local testing hadn't
  caught it. `loginctl enable-linger` was tried first based on a plausible
  but wrong hypothesis (ruled out by the user re-testing with linger already
  enabled) — deliberately **not** documented as a fix anywhere, since it
  wasn't actually the cause of this failure.
- **2026-08-06 (4)** — Added a Gotcha entry documenting the SELinux
  `status=203/EXEC` failure hit while registering the self-hosted runner on
  this deployment's actual VM (SELinux-enforcing, home-directory `user_home_t`
  context blocking systemd execution) and its fix (`semanage fcontext` +
  `restorecon` to `bin_t`). `Infrastructure/README.md`'s runner-registration
  section gained a matching troubleshooting note.
- **2026-08-06 (3)** — Added a note under ID-001 explaining the self-hosted
  runner's network/trust model (outbound-only connection to GitHub, why no
  SSH keys or registry are needed, the code-execution trust boundary) — asked
  directly by the user, previously asserted but never spelled out.
- **2026-08-06 (2)** — `.github/workflows/deploy.yml` rewritten to actually
  deploy the full 5-container stack (ID-012): generates `Infrastructure/.env`
  from GitHub Actions repo Variables/Secrets on every run instead of
  depending on a manually-persisted file, validates required config up front,
  pulls pinned `postgres`/`keycloak` images explicitly before building the
  three application images, and expands the smoke test to check the
  front-end, Keycloak (`master` realm — see Gotchas), and the BFF through the
  proxy, dumping logs on failure. `Infrastructure/README.md` gained a
  "GitHub Actions (CI/CD) deploy" section with runner-registration steps and
  the exact `gh variable set`/`gh secret set` commands needed. Resolves the
  `.env`/`actions/checkout` risk previously logged under Open Questions.
- **2026-08-06** — Initial version. Documents the full design and build-out of
  the 5-container stack (ID-001 through ID-011) and every gotcha discovered
  while verifying it end-to-end with a live local Podman run (Keycloak
  `--optimized` crash loop, missing curl/wget, health path prefixing,
  `KC_HOSTNAME`/issuer bug, deprecated admin env vars, `.containerignore`
  precedence, two pre-existing application bugs). Companion `Infrastructure/README.md`
  rewritten to match. `CLAUDE.md` created to keep this document living going
  forward.
