#!/bin/sh
# Off-server copy of the database in a private GitHub repository.
#
#   deploy/backup-to-github.sh
#
# Commits a plain-text dump (one row per line, no timestamps) as clinema.sql,
# so git stores each backup as a small diff and the commit history is the
# archive; nothing is committed when the data hasn't changed. Pushes over SSH
# with a deploy key that can only write to that repository.
#
# Settings (environment): BACKUP_REPO (default git@github-backups:Matsadura/clinema-backups.git,
# where "github-backups" is an ~/.ssh/config alias for the deploy key) and
# BACKUP_CHECKOUT (default ~/clinema-backups-repo). Cron example:
#   45 */6 * * * cd ~/Clinema && deploy/backup-to-github.sh >> ~/clinema-backups/github.log 2>&1
set -eu

cd "$(dirname "$0")/.."
REPO=${BACKUP_REPO:-git@github-backups:Matsadura/clinema-backups.git}
CHECKOUT=${BACKUP_CHECKOUT:-"$HOME/clinema-backups-repo"}

if [ ! -d "$CHECKOUT/.git" ]; then
  git clone -q "$REPO" "$CHECKOUT"
fi
chmod 700 "$CHECKOUT"
git -C "$CHECKOUT" pull -q --ff-only origin main 2>/dev/null || true  # empty on first run

TMP="$CHECKOUT/clinema.sql.partial"
docker compose exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --single-transaction --no-tablespaces --routines --skip-extended-insert --skip-dump-date -u "$MYSQL_USER" "$MYSQL_DATABASE"' \
  > "$TMP"
# Only a finished dump ends with this line (the pipe hides mysqldump's exit code)
tail -n 1 "$TMP" | grep -q "^-- Dump completed" || { echo "backup incomplete" >&2; rm -f "$TMP"; exit 1; }
mv "$TMP" "$CHECKOUT/clinema.sql"

cd "$CHECKOUT"
git add clinema.sql
if git diff --cached --quiet; then
  echo "$(date -Is) github backup: no changes"
  exit 0
fi
git -c user.name="Clinema server" -c user.email="backups@clinema.invalid" \
  commit -q -m "backup $(date -u +%FT%TZ)"
git push -q origin HEAD:main
echo "$(date -Is) github backup pushed: $(git rev-parse --short HEAD) ($(du -h clinema.sql | cut -f1))"
