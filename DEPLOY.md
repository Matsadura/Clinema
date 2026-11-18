# Deploying Clinema to a VPS

The stack runs with Docker Compose. Caddy, on the host, terminates HTTPS and
proxies to the web container on `127.0.0.1:8080`. No paid domain is needed:
[sslip.io](https://sslip.io) maps `1-2-3-4.sslip.io` to `1.2.3.4`, and
[DuckDNS](https://www.duckdns.org) gives a free `yourname.duckdns.org`.

```
internet ──443──▶ Caddy (host) ──▶ 127.0.0.1:8080 nginx (web) ──▶ api (gunicorn) ──▶ db (MySQL)
                                                                         └──▶ redis (rate limits)
```

## 1. Server basics (Ubuntu)

```bash
sudo apt update && sudo apt upgrade -y
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable
# 1 GB machines: add swap so MySQL and the image builds fit
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile \
  && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker "$USER"   # then log in again
```

On a cloud VPS (AWS, Oracle, …) also open TCP 80 and 443 in the provider's
firewall / security group.

## 2. The app

```bash
git clone https://github.com/Matsadura/Clinema.git && cd Clinema
cp .env.example .env && chmod 600 .env
```

Fill in `.env`: `APP_ENV=production`, your TMDB and Groq keys, and fresh secrets
(`python3 -c "import secrets; print(secrets.token_hex(32))"` for
`JWT_SECRET_KEY`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`;
`python3 -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"`
for `KEY_ENCRYPTION_KEY`). For the Caddy setup add:

```
WEB_BIND=127.0.0.1
TRUSTED_PROXIES=2
```

```bash
docker compose up -d --build --wait
```

## 3. HTTPS with Caddy

Install Caddy from its [official apt repo](https://caddyserver.com/docs/install#debian-ubuntu-raspbian),
copy [`deploy/Caddyfile`](deploy/Caddyfile) to `/etc/caddy/Caddyfile`, set your
hostname, then `sudo systemctl reload caddy`. It also sends HSTS, so browsers
only ever use HTTPS for the site.

With DuckDNS, keep the IP current with a cron entry (only needed if the IP can change):

```
*/5 * * * * curl -fsS "https://www.duckdns.org/update?domains=NAME&token=TOKEN&ip=" >/dev/null
```

## Backups

[`deploy/backup.sh`](deploy/backup.sh) writes a consistent, compressed dump to
`~/clinema-backups/clinema-YYYY-MM-DD.sql.gz`, checks it, and keeps 14 days.
Schedule it nightly (`crontab -e`):

```
15 3 * * * cd ~/Clinema && deploy/backup.sh >> ~/clinema-backups/backup.log 2>&1
```

Backups on the same disk don't survive losing the server: now and then copy
them elsewhere, e.g. `scp -r ubuntu@SERVER:clinema-backups ./`.

Restore into the running stack:

```bash
gunzip -c ~/clinema-backups/clinema-2026-01-31.sql.gz \
  | docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"'
```

## Monitoring

[`.github/workflows/uptime.yml`](.github/workflows/uptime.yml) checks
`/api/health` every 30 minutes; GitHub emails you when a scheduled run fails.
Point it at your host with the repository variable `HEALTHCHECK_URL`. GitHub
pauses scheduled workflows after 60 days without repository activity; re-enable
it from the Actions tab if that happens.

## Operating it

| Task | Command |
| --- | --- |
| Update | `git pull && docker compose up -d --build --wait` |
| Status / logs | `docker compose ps` · `docker compose logs -f api` |
| Back up now | `deploy/backup.sh` |

Containers use `restart: unless-stopped`, so they come back after a reboot.
Rate limits are shared by all API workers through the bundled Redis; if Redis
is down the API falls back to per-worker limits rather than failing.
