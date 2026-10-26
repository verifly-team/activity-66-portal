#!/usr/bin/env bash
set -euo pipefail
umask 022

APP_DIR="${APP_DIR:-/opt/activity-66}"
PORTAL_IMAGE="${PORTAL_IMAGE:-}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTP_BIND="${HTTP_BIND:-0.0.0.0}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
KEEP_IMAGES="${KEEP_IMAGES:-3}"
CONTAINER_NAME="activity-66-portal"
INCOMING_DIR="$APP_DIR/incoming"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"

if [[ -z "$PORTAL_IMAGE" ]]; then
  echo "PORTAL_IMAGE is required." >&2
  exit 1
fi

if [[ ! "$PORTAL_IMAGE" =~ ^[A-Za-z0-9._/-]+:[A-Za-z0-9._-]+$ ]]; then
  echo "PORTAL_IMAGE contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$HTTP_BIND" =~ ^[A-Za-z0-9.:_-]+$ ]]; then
  echo "HTTP_BIND contains unsupported characters." >&2
  exit 1
fi

if [[ ! "$KEEP_IMAGES" =~ ^[0-9]+$ ]] || (( KEEP_IMAGES < 1 )); then
  echo "KEEP_IMAGES must be a positive integer." >&2
  exit 1
fi

if [[ ! -f "$INCOMING_DIR/image.tar.gz" ]]; then
  echo "Image archive is missing: $INCOMING_DIR/image.tar.gz" >&2
  exit 1
fi

if [[ ! -f "$INCOMING_DIR/docker-compose.yml" ]]; then
  echo "Compose file is missing: $INCOMING_DIR/docker-compose.yml" >&2
  exit 1
fi

for command in docker gzip curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing command on ECS: $command" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required on ECS." >&2
  exit 1
fi

PREVIOUS_IMAGE="$(
  docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true
)"

echo "Loading image $PORTAL_IMAGE"
gzip -dc "$INCOMING_DIR/image.tar.gz" | docker load
docker image inspect "$PORTAL_IMAGE" >/dev/null

install -m 0644 "$INCOMING_DIR/docker-compose.yml" "$COMPOSE_FILE"

write_env() {
  local image="$1"
  cat > "$ENV_FILE.tmp" <<EOF
PORTAL_IMAGE=$image
HTTP_PORT=$HTTP_PORT
HTTP_BIND=$HTTP_BIND
EOF
  chmod 600 "$ENV_FILE.tmp"
  mv -f "$ENV_FILE.tmp" "$ENV_FILE"
}

compose_up() {
  docker compose \
    --project-directory "$APP_DIR" \
    --file "$COMPOSE_FILE" \
    up --detach --remove-orphans
}

rollback_or_stop() {
  if [[ -n "$PREVIOUS_IMAGE" && "$PREVIOUS_IMAGE" != "$PORTAL_IMAGE" ]]; then
    echo "Restoring $PREVIOUS_IMAGE" >&2
    write_env "$PREVIOUS_IMAGE"
    if ! compose_up; then
      echo "Rollback failed; inspect docker compose logs." >&2
    fi
  else
    docker compose \
      --project-directory "$APP_DIR" \
      --file "$COMPOSE_FILE" \
      down --remove-orphans
  fi
}

write_env "$PORTAL_IMAGE"
if ! compose_up; then
  echo "Failed to start the new container." >&2
  rollback_or_stop
  exit 1
fi

if [[ -z "$HEALTHCHECK_URL" ]]; then
  HEALTHCHECK_URL="http://127.0.0.1:$HTTP_PORT/app.html"
fi

check_health() {
  local status
  status="$(
    docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$CONTAINER_NAME" 2>/dev/null || true
  )"
  [[ "$status" == "healthy" ]] || return 1
  curl -fsS --max-time 10 "$HEALTHCHECK_URL" >/dev/null
}

healthy=0
for attempt in {1..30}; do
  if check_health; then
    healthy=1
    break
  fi
  sleep 2
done

if (( healthy == 0 )); then
  echo "Health check failed: $HEALTHCHECK_URL" >&2
  rollback_or_stop
  exit 1
fi

rm -rf -- "$INCOMING_DIR"

ACTIVE_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$PORTAL_IMAGE")"
mapfile -t PORTAL_IMAGE_IDS < <(
  docker image ls \
    --filter 'label=com.activity-66.portal=true' \
    --format '{{.ID}}' \
    | awk '!seen[$0]++'
)
kept=0
for image_id in "${PORTAL_IMAGE_IDS[@]}"; do
  if (( kept < KEEP_IMAGES )); then
    kept=$((kept + 1))
    continue
  fi
  if [[ "$image_id" == "$ACTIVE_IMAGE_ID" ]]; then
    continue
  fi
  docker image rm "$image_id" >/dev/null 2>&1 || true
done

echo "Container health: healthy"
echo "Active image: $PORTAL_IMAGE"
