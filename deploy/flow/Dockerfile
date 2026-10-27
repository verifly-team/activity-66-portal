# 云效 Flow 使用的镜像：从源码直接构建，不依赖构建工作区里已有的 dist/。
FROM node:24-alpine AS build

WORKDIR /app

ARG REVISION=unknown

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build \
    && printf '%s\n' "$REVISION" > dist/REVISION

FROM nginx:1.27-alpine

ARG REVISION=unknown
LABEL org.opencontainers.image.title="activity-66-portal" \
      org.opencontainers.image.revision="${REVISION}" \
      com.activity-66.portal="true"

COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

RUN test -s /usr/share/nginx/html/app.html \
    && sh -c 'for asset in /usr/share/nginx/html/assets/*.js; do [ -f "$asset" ] && exit 0; done; exit 1'

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

EXPOSE 80
