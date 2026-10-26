FROM nginx:1.27-alpine

ARG REVISION=unknown
LABEL org.opencontainers.image.title="activity-66-portal" \
      org.opencontainers.image.revision="${REVISION}" \
      com.activity-66.portal="true"

COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

RUN test -s /usr/share/nginx/html/app.html \
    && sh -c 'for asset in /usr/share/nginx/html/assets/*.js; do [ -f "$asset" ] && exit 0; done; exit 1'

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

EXPOSE 80
