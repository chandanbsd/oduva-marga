# Infrastructure

Podman + GitHub Actions setup for building and deploying `oduva-mage-front-end` to a self-hosted VM.

## How it works

- `podman-compose.yml` builds the Angular app into an nginx-served image and runs it on port `8080`.
- `.github/workflows/deploy.yml` runs on a **self-hosted GitHub Actions runner** installed on the target VM. On every push to `main` (or manual trigger) it rebuilds and redeploys the container locally via `podman-compose` — no container registry or SSH keys required.

## One-time VM setup

1. **Install Podman and podman-compose**

   ```sh
   # Debian/Ubuntu
   sudo apt-get update && sudo apt-get install -y podman
   pip3 install --user podman-compose

   # Fedora/RHEL
   sudo dnf install -y podman podman-compose
   ```

2. **Register the VM as a GitHub Actions self-hosted runner**

   In the repo: **Settings → Actions → Runners → New self-hosted runner**, then follow the generated download/config commands on the VM, e.g.:

   ```sh
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner.tar.gz -L <url-from-github>
   tar xzf actions-runner.tar.gz
   ./config.sh --url https://github.com/<org>/oduva-marga --token <token-from-github>
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

   Run the runner as a **non-root user** that has rootless Podman configured, not as root.

3. **Open the deploy port**

   Allow inbound traffic on `8080` (or whichever host port you choose in `podman-compose.yml`) through the VM's firewall/security group.

## Manual verification

```sh
cd oduva-mage-front-end
podman build -t oduva-mage-front-end:test .
podman run --rm -p 8080:80 oduva-mage-front-end:test
curl localhost:8080
```

Or via compose, from this directory:

```sh
podman-compose up -d
curl localhost:8080
```
