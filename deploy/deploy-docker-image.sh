#!/usr/bin/env bash
set -euo pipefail
umask 022

ALIYUN_HOST="${ALIYUN_HOST:-}"
ALIYUN_USER="${ALIYUN_USER:-deploy}"
ALIYUN_PORT="${ALIYUN_PORT:-22}"
ALIYUN_SSH_KEY="${ALIYUN_SSH_KEY:-$HOME/.ssh/activity-66_deploy}"
APP_DIR="${ALIYUN_APP_DIR:-/opt/activity-66}"
HTTP_PORT="${ALIYUN_HTTP_PORT:-80}"
HTTP_BIND="${ALIYUN_HTTP_BIND:-0.0.0.0}"
HEALTHCHECK_URL="${ALIYUN_HEALTHCHECK_URL:-}"
SSH_STRICT_HOST_CHECKING="${SSH_STRICT_HOST_CHECKING:-accept-new}"
DOCKER_PLATFORM="${ALIYUN_DOCKER_PLATFORM:-linux/amd64}"
IMAGE_REPOSITORY="activity-66-portal"

if [[ -z "$ALIYUN_HOST" ]]; then
  echo "Set ALIYUN_HOST to the ECS IP or hostname." >&2
  exit 1
fi

if [[ ! "$ALIYUN_HOST" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "ALIYUN_HOST contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$ALIYUN_USER" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "ALIYUN_USER contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$ALIYUN_PORT" =~ ^[0-9]+$ ]] || (( ALIYUN_PORT < 1 || ALIYUN_PORT > 65535 )); then
  echo "ALIYUN_PORT must be a valid TCP port." >&2
  exit 1
fi

if [[ ! "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "ALIYUN_APP_DIR must be a simple absolute path." >&2
  exit 1
fi

if [[ ! "$HTTP_PORT" =~ ^[0-9]+$ ]] || (( HTTP_PORT < 1 || HTTP_PORT > 65535 )); then
  echo "ALIYUN_HTTP_PORT must be a valid TCP port." >&2
  exit 1
fi

if [[ ! "$HTTP_BIND" =~ ^[A-Za-z0-9.:_-]+$ ]]; then
  echo "ALIYUN_HTTP_BIND contains unsupported characters." >&2
  exit 1
fi

if [[ -n "$HEALTHCHECK_URL" && ! "$HEALTHCHECK_URL" =~ ^https?://[A-Za-z0-9.:/_-]+$ ]]; then
  echo "ALIYUN_HEALTHCHECK_URL must be a simple HTTP(S) URL." >&2
  exit 1
fi

if [[ ! "$SSH_STRICT_HOST_CHECKING" =~ ^(yes|accept-new|no)$ ]]; then
  echo "SSH_STRICT_HOST_CHECKING must be yes, accept-new, or no." >&2
  exit 1
fi

if [[ ! "$DOCKER_PLATFORM" =~ ^linux/[A-Za-z0-9_]+$ ]]; then
  echo "ALIYUN_DOCKER_PLATFORM must be a Linux Docker platform." >&2
  exit 1
fi

if [[ ! -f dist/app.html ]]; then
  echo "Build dist/ before deploying the image." >&2
  exit 1
fi

if ! compgen -G "dist/assets/*.js" >/dev/null; then
  echo "Build output is missing dist/assets/*.js" >&2
  exit 1
fi

for command in docker ssh rsync gzip; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing command: $command" >&2
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running." >&2
  exit 1
fi

if [[ "$ALIYUN_SSH_KEY" == "~/"* ]]; then
  ALIYUN_SSH_KEY="$HOME/${ALIYUN_SSH_KEY#\~/}"
fi

if [[ ! -f "$ALIYUN_SSH_KEY" ]]; then
  echo "SSH key not found: $ALIYUN_SSH_KEY" >&2
  exit 1
fi

REVISION="${REVISION:-$(git rev-parse HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"
RELEASE="${RELEASE:-$(date -u +%Y%m%d%H%M%S)-${GITHUB_RUN_ID:-${REVISION:0:12}}}"
IMAGE="$IMAGE_REPOSITORY:$RELEASE"
WORK_DIR="$(mktemp -d)"

cleanup() {
  rm -rf -- "$WORK_DIR"
}
trap cleanup EXIT

echo "[1/4] Building image $IMAGE"
docker build \
  --platform "$DOCKER_PLATFORM" \
  --build-arg "REVISION=$REVISION" \
  --file deploy/docker/Dockerfile \
  --tag "$IMAGE" \
  .

echo "[2/4] Packing image"
docker save "$IMAGE" | gzip -6 > "$WORK_DIR/image.tar.gz"
cp deploy/docker-compose.yml "$WORK_DIR/docker-compose.yml"

SSH_OPTS=(
  -p "$ALIYUN_PORT"
  -i "$ALIYUN_SSH_KEY"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o ConnectTimeout=15
  -o "StrictHostKeyChecking=$SSH_STRICT_HOST_CHECKING"
)
REMOTE="$ALIYUN_USER@$ALIYUN_HOST"

echo "[3/4] Uploading image"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "mkdir -p '$APP_DIR/incoming'"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  "$WORK_DIR/" "$REMOTE:$APP_DIR/incoming/"

echo "[4/4] Starting release $RELEASE"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "APP_DIR='$APP_DIR' PORTAL_IMAGE='$IMAGE' HTTP_PORT='$HTTP_PORT' HTTP_BIND='$HTTP_BIND' HEALTHCHECK_URL='$HEALTHCHECK_URL' KEEP_IMAGES='${KEEP_IMAGES:-3}' bash -s" \
  < deploy/deploy-remote.sh

if [[ -n "${GITHUB_ENV:-}" ]]; then
  echo "RELEASE=$RELEASE" >> "$GITHUB_ENV"
  echo "PORTAL_IMAGE=$IMAGE" >> "$GITHUB_ENV"
fi

echo "Deployed image $IMAGE"
