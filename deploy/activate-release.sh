#!/usr/bin/env bash
set -euo pipefail
umask 022

APP_DIR="${APP_DIR:-/var/www/activity-66}"
RELEASE="${1:-}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
SITE_HOST="${SITE_HOST:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1/app.html}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-5}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-2}"

if [[ -z "$RELEASE" ]]; then
  echo "Usage: activate-release.sh <release-name>" >&2
  exit 1
fi

if [[ ! "$RELEASE" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "Invalid release name: $RELEASE" >&2
  exit 1
fi

if [[ ! "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "APP_DIR must be a simple absolute path: $APP_DIR" >&2
  exit 1
fi

if [[ -z "$SITE_HOST" ]]; then
  echo "SITE_HOST is required for the health check" >&2
  exit 1
fi

if [[ ! "$SITE_HOST" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "SITE_HOST contains unsupported characters: $SITE_HOST" >&2
  exit 1
fi

if ! [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || (( KEEP_RELEASES < 1 )); then
  echo "KEEP_RELEASES must be a positive integer" >&2
  exit 1
fi

if ! [[ "$HEALTHCHECK_RETRIES" =~ ^[0-9]+$ ]] || (( HEALTHCHECK_RETRIES < 1 )); then
  echo "HEALTHCHECK_RETRIES must be a positive integer" >&2
  exit 1
fi

RELEASES_DIR="$APP_DIR/releases"
TARGET="$RELEASES_DIR/$RELEASE"
CURRENT="$APP_DIR/current"

if [[ ! -f "$TARGET/app.html" ]]; then
  echo "Release is missing app.html: $TARGET" >&2
  exit 1
fi

chmod -R a+rX "$TARGET"

SHARED_ASSETS="$APP_DIR/shared/assets"
mkdir -p "$SHARED_ASSETS"
cp -a "$TARGET/assets/." "$SHARED_ASSETS/"
printf '%s\n' "$RELEASE" > "$SHARED_ASSETS/shared-health.txt"
chmod -R a+rX "$SHARED_ASSETS"

mapfile -t asset_paths < <(
  grep -oE '(\./|/)assets/[^"]+' "$TARGET/app.html" \
    | sed -e 's#^\./##' -e 's#^/##'
)

if (( ${#asset_paths[@]} == 0 )); then
  echo "No asset references found in $TARGET/app.html" >&2
  exit 1
fi

for asset in "${asset_paths[@]}"; do
  if [[ ! -f "$APP_DIR/shared/$asset" ]]; then
    echo "Missing shared asset: $asset" >&2
    exit 1
  fi
done

cd "$APP_DIR"
PREV="$(readlink current || true)"

ln -sfn "releases/$RELEASE" current.new
mv -Tf current.new current

curl_args=(-fsS -L --max-redirs 3 --max-time 10)
if [[ -n "$SITE_HOST" ]]; then
  curl_args+=(-H "Host: $SITE_HOST")
fi

check_health() {
  if ! curl "${curl_args[@]}" "$HEALTHCHECK_URL" >/dev/null; then
    return 1
  fi

  if [[ "$HEALTHCHECK_URL" == */app.html ]]; then
    local base_url="${HEALTHCHECK_URL%/app.html}"
    local asset="${asset_paths[0]}"
    if ! curl "${curl_args[@]}" "$base_url/$asset" >/dev/null; then
      return 1
    fi
    if ! curl "${curl_args[@]}" \
      "$base_url/assets/shared-health.txt?release=$RELEASE" \
      | grep -Fqx "$RELEASE"; then
      return 1
    fi
  fi
}

healthy=0
for ((attempt = 1; attempt <= HEALTHCHECK_RETRIES; attempt++)); do
  if check_health; then
    healthy=1
    break
  fi
  if (( attempt < HEALTHCHECK_RETRIES )); then
    sleep "$HEALTHCHECK_DELAY"
  fi
done

if (( healthy == 0 )); then
  echo "Health check failed: $HEALTHCHECK_URL" >&2
  if [[ -n "$PREV" ]]; then
    ln -sfn "$PREV" current.new
    mv -Tf current.new current
    echo "Rolled back to $PREV" >&2
  else
    echo "No previous release available for rollback" >&2
  fi
  exit 1
fi

ACTIVE="$(readlink -f "$CURRENT" || true)"
if [[ -n "$ACTIVE" ]]; then
  mapfile -t releases < <(
    find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
      | sort -nr \
      | cut -d' ' -f2-
  )
  kept=1
  for old in "${releases[@]}"; do
    if [[ "$old" == "$ACTIVE" ]]; then
      continue
    fi
    if (( kept >= KEEP_RELEASES )); then
      rm -rf -- "$old"
    else
      kept=$((kept + 1))
    fi
  done
fi

echo "Activated release $RELEASE"
