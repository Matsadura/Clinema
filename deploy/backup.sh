#!/bin/sh
# Nightly MySQL backup for the Docker Compose stack.
#
#   deploy/backup.sh [backup-dir]       (default: ~/clinema-backups)
#
# Writes clinema-YYYY-MM-DD.sql.gz, keeps the last $KEEP_DAYS days (14),
# and fails loudly if the dump is empty or unreadable. Cron example:
#   15 3 * * * cd ~/Clinema && deploy/backup.sh >> ~/clinema-backups/backup.log 2>&1
set -eu

cd "$(dirname "$0")/.."
DIR=${1:-"$HOME/clinema-backups"}
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DIR"
chmod 700 "$DIR"
OUT="$DIR/clinema-$(date +%F).sql.gz"
TMP="$OUT.partial"

# Credentials stay inside the db container; --single-transaction gives a
# consistent InnoDB snapshot without locking the site.
docker compose exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --single-transaction --no-tablespaces --routines -u "$MYSQL_USER" "$MYSQL_DATABASE"' \
  | gzip -9 > "$TMP"

gzip -t "$TMP"
# mysqldump writes this trailer only when it finishes; a dump cut off
# midway (a pipe hides mysqldump's exit code) would lack it
gunzip -c "$TMP" | tail -n 1 | grep -q "^-- Dump completed" || { echo "backup incomplete" >&2; rm -f "$TMP"; exit 1; }
mv "$TMP" "$OUT"
chmod 600 "$OUT"
find "$DIR" -maxdepth 1 -name 'clinema-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
