#!/usr/bin/env bash
set -euo pipefail
umask 022

ALIYUN_HOST="${ALIYUN_HOST:-}"
ALIYUN_USER="${ALIYUN_USER:-deploy}"
ALIYUN_PORT="${ALIYUN_PORT:-22}"
ALIYUN_SSH_KEY="${ALIYUN_SSH_KEY:-$HOME/.ssh/activity-66_deploy}"
APP_DIR="${ALIYUN_APP_DIR:-/var/www/activity-66}"
SITE_HOST="${ALIYUN_SITE_HOST:-}"
HEALTHCHECK_URL="${ALIYUN_HEALTHCHECK_URL:-}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

if [[ -z "$ALIYUN_HOST" ]]; then
  echo "Set ALIYUN_HOST to the ECS IP or hostname." >&2
  exit 1
fi

if [[ -z "$SITE_HOST" ]]; then
  echo "Set ALIYUN_SITE_HOST to the domain or IP served by nginx." >&2
  exit 1
fi

if [[ ! "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "ALIYUN_APP_DIR must be a simple absolute path." >&2
  exit 1
fi

if [[ ! "$SITE_HOST" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "ALIYUN_SITE_HOST contains unsupported characters." >&2
  exit 1
fi

if [[ ! -f package.json ]]; then
  echo "Run this script from the repository root." >&2
  exit 1
fi

if [[ "$ALIYUN_SSH_KEY" == "~/"* ]]; then
  ALIYUN_SSH_KEY="$HOME/${ALIYUN_SSH_KEY#\~/}"
fi

if [[ ! -f "$ALIYUN_SSH_KEY" ]]; then
  echo "SSH key not found: $ALIYUN_SSH_KEY" >&2
  exit 1
fi

for command in npm rsync ssh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing command: $command" >&2
    exit 1
  fi
done

echo "[1/4] Installing dependencies"
npm ci --no-audit --no-fund

echo "[2/4] Building static site"
npm run build

if [[ ! -f dist/app.html ]]; then
  echo "Build output is missing dist/app.html" >&2
  exit 1
fi

if ! compgen -G "dist/assets/*.js" >/dev/null; then
  echo "Build output is missing dist/assets/*.js" >&2
  exit 1
fi

REVISION="$(git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)"
printf '%s\n' "$REVISION" > dist/REVISION
RELEASE="$(date -u +%Y%m%d%H%M%S)-$REVISION"

SSH_OPTS=(
  -p "$ALIYUN_PORT"
  -i "$ALIYUN_SSH_KEY"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o ConnectTimeout=15
  -o StrictHostKeyChecking=accept-new
)

echo "[3/4] Uploading release $RELEASE"
ssh "${SSH_OPTS[@]}" "$ALIYUN_USER@$ALIYUN_HOST" \
  "mkdir -p '$APP_DIR/releases/$RELEASE'"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  dist/ "$ALIYUN_USER@$ALIYUN_HOST:$APP_DIR/releases/$RELEASE/"

echo "[4/4] Activating release"
ssh "${SSH_OPTS[@]}" "$ALIYUN_USER@$ALIYUN_HOST" \
  "APP_DIR='$APP_DIR' SITE_HOST='$SITE_HOST' HEALTHCHECK_URL='$HEALTHCHECK_URL' KEEP_RELEASES='$KEEP_RELEASES' bash -s -- '$RELEASE'" \
  < deploy/activate-release.sh

echo "Deployed release $RELEASE"
