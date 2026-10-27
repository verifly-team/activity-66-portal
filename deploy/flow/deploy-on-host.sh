#!/usr/bin/env bash
# 在云效 Flow「主机 Docker 部署」的部署脚本中执行。
# 只负责拉取 ACR 镜像并滚动替换容器，构建发生在流水线的镜像构建步骤。
set -euo pipefail
umask 022

APP_DIR="${APP_DIR:-/opt/activity-66}"
PORTAL_IMAGE="${PORTAL_IMAGE:-}"
ACR_REGISTRY="${ACR_REGISTRY:-}"
ACR_USERNAME="${ACR_USERNAME:-}"
ACR_PASSWORD="${ACR_PASSWORD:-}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTP_BIND="${HTTP_BIND:-0.0.0.0}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
KEEP_IMAGES="${KEEP_IMAGES:-3}"

CONTAINER_NAME="activity-66-portal"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"

if [[ -z "$PORTAL_IMAGE" ]]; then
  echo "PORTAL_IMAGE 为空：需要传入镜像构建步骤输出的镜像地址。" >&2
  exit 1
fi

if [[ ! "$PORTAL_IMAGE" =~ ^[A-Za-z0-9._:/-]+:[A-Za-z0-9._-]+$ ]]; then
  echo "PORTAL_IMAGE 格式不正确：$PORTAL_IMAGE" >&2
  exit 1
fi

if [[ ! "$APP_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "APP_DIR 必须是简单的绝对路径：$APP_DIR" >&2
  exit 1
fi

if [[ ! "$HTTP_PORT" =~ ^[0-9]+$ ]] || (( HTTP_PORT < 1 || HTTP_PORT > 65535 )); then
  echo "HTTP_PORT 必须是合法的 TCP 端口。" >&2
  exit 1
fi

if [[ ! "$HTTP_BIND" =~ ^[A-Za-z0-9.:_-]+$ ]]; then
  echo "HTTP_BIND 包含不支持的字符。" >&2
  exit 1
fi

if [[ -n "$HEALTHCHECK_URL" && ! "$HEALTHCHECK_URL" =~ ^https?://[A-Za-z0-9.:/_-]+$ ]]; then
  echo "HEALTHCHECK_URL 必须是简单的 HTTP(S) 地址。" >&2
  exit 1
fi

if [[ ! "$KEEP_IMAGES" =~ ^[0-9]+$ ]] || (( KEEP_IMAGES < 1 )); then
  echo "KEEP_IMAGES 必须是正整数。" >&2
  exit 1
fi

for command in docker curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "ECS 缺少命令：$command" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "ECS 需要 Docker Compose v2。" >&2
  exit 1
fi

PREVIOUS_IMAGE="$(
  docker inspect --format '{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true
)"

if [[ -n "$ACR_PASSWORD" ]]; then
  if [[ -z "$ACR_REGISTRY" || -z "$ACR_USERNAME" ]]; then
    echo "配置了 ACR_PASSWORD 时必须同时配置 ACR_REGISTRY 和 ACR_USERNAME。" >&2
    exit 1
  fi
  echo "登录镜像仓库 $ACR_REGISTRY"
  printf '%s' "$ACR_PASSWORD" \
    | docker login "$ACR_REGISTRY" --username "$ACR_USERNAME" --password-stdin >/dev/null
fi

echo "拉取镜像 $PORTAL_IMAGE"
docker pull "$PORTAL_IMAGE"
docker image inspect "$PORTAL_IMAGE" >/dev/null

install -d -m 0755 "$APP_DIR"

cat > "$COMPOSE_FILE.tmp" <<'YAML'
name: activity-66
services:
  portal:
    image: ${PORTAL_IMAGE:?PORTAL_IMAGE is required}
    container_name: activity-66-portal
    restart: unless-stopped
    pull_policy: always
    ports:
      - "${HTTP_BIND:-0.0.0.0}:${HTTP_PORT:-80}:80"
    security_opt:
      - no-new-privileges:true
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
YAML
chmod 0644 "$COMPOSE_FILE.tmp"
mv -f "$COMPOSE_FILE.tmp" "$COMPOSE_FILE"

write_env() {
  local image="$1"
  {
    printf 'PORTAL_IMAGE=%s\n' "$image"
    printf 'HTTP_PORT=%s\n' "$HTTP_PORT"
    printf 'HTTP_BIND=%s\n' "$HTTP_BIND"
  } > "$ENV_FILE.tmp"
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
    echo "回滚到 $PREVIOUS_IMAGE" >&2
    write_env "$PREVIOUS_IMAGE"
    if ! compose_up; then
      echo "回滚启动失败，请执行 docker compose logs 排查。" >&2
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
  echo "新容器启动失败。" >&2
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
for _ in {1..30}; do
  if check_health; then
    healthy=1
    break
  fi
  sleep 2
done

if (( healthy == 0 )); then
  echo "健康检查失败：$HEALTHCHECK_URL" >&2
  rollback_or_stop
  exit 1
fi

ACTIVE_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$PORTAL_IMAGE")"
PORTAL_IMAGE_IDS=()
while IFS= read -r image_id; do
  PORTAL_IMAGE_IDS+=("$image_id")
done < <(
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

echo "容器状态：healthy"
echo "当前镜像：$PORTAL_IMAGE"
