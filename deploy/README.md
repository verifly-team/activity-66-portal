# 阿里云 ECS 静态站发布

这套流水线把 `activity-66-portal` 当作静态站发布，不构建 Docker 镜像。

当前目录如果还没有 `.git`，先在 GitHub 建仓库并推送；Actions 只会在 GitHub 收到提交后运行。

```text
push main / 手动运行
  -> npm ci
  -> npm run build
  -> rsync dist/ 到 ECS 的 releases/<release>
  -> 追加 assets 到 shared/assets
  -> 切换 current 软链
  -> nginx 立即读取新版本
```

线上只发布 `dist/`。根目录的 `index.html` 是 `file://` 预览产物，不是线上入口，已经加入 `.gitignore`。

Vite 的资源文件名带 hash。发布时会把新资源复制到
`ALIYUN_APP_DIR/shared/assets`（默认 `/var/www/activity-66/shared/assets`），
不删除旧文件，避免用户正在加载旧 `app.html` 时切换版本后请求旧 JS 得到 404。
发布目录里仍保留一份完整 `assets/`，作为排查和兜底；线上 nginx 的
`/assets/` 指向 shared。

健康检查会请求 `/assets/shared-health.txt` 来确认真实流量已经命中 shared。
如果 `/assets/` 仍然指向 `current/assets`，发布会失败并自动回滚。

## 服务器一次性准备

以下命令按 Linux ECS 编写。`/var/www/activity-66` 可以在 GitHub Variables 里通过 `ALIYUN_APP_DIR` 覆盖。

```bash
sudo mkdir -p /var/www/activity-66/releases /var/www/activity-66/shared/assets
id deploy >/dev/null 2>&1 || sudo useradd -m -s /bin/bash deploy
sudo chown -R deploy:deploy /var/www/activity-66
sudo chmod -R a+rX /var/www/activity-66
```

安装 nginx、rsync 和 curl。Ubuntu 或 Debian 使用：

```bash
sudo apt-get update
sudo apt-get install -y nginx rsync curl
```

Alibaba Cloud Linux、CentOS 或 RHEL 使用：

```bash
sudo dnf install -y nginx rsync curl
```

生成专用部署密钥。私钥不要提交到仓库：

```bash
ssh-keygen -t ed25519 -C "github-actions-activity-66" -f ~/.ssh/activity-66_deploy -N ""
ssh-copy-id -i ~/.ssh/activity-66_deploy.pub deploy@ECS_IP
```

把 `deploy/nginx.conf.example` 复制到 nginx 配置目录，替换域名并 reload：

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/activity-66.conf
sudo sed -i 's/activity.example.com/your-domain.example/g' /etc/nginx/conf.d/activity-66.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果 80/443 已经被现有 nginx 容器占用，不要新起 nginx 抢端口。把
`/var/www/activity-66` 只读挂进现有容器，并把同样的 server block 加进容器配置：

```yaml
volumes:
  - /var/www/activity-66:/var/www/activity-66:ro
```

如果 nginx 只监听容器网络、宿主机无法访问 80，请把
`ALIYUN_HEALTHCHECK_URL` 改成宿主机可访问的地址（例如已发布的 HTTPS 域名）。

首次发布前先把 nginx 配好并 reload，否则健康检查会失败并触发回滚。

## GitHub 配置

在仓库的 Settings -> Secrets and variables -> Actions 中配置：

| 名称 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ALIYUN_HOST` | Secret | 是 | ECS 公网 IP 或域名 |
| `ALIYUN_USER` | Secret | 是 | `deploy` |
| `ALIYUN_SSH_KEY` | Secret | 是 | `~/.ssh/activity-66_deploy` 的完整私钥内容 |
| `ALIYUN_PORT` | Secret | 否 | SSH 端口，默认 22 |
| `ALIYUN_KNOWN_HOSTS` | Secret | 否 | 推荐固定主机指纹，内容来自 `ssh-keyscan -p 22 -H ECS_IP` |
| `ALIYUN_APP_DIR` | Variable | 否 | 默认 `/var/www/activity-66` |
| `ALIYUN_SITE_HOST` | Variable | 是 | nginx `server_name` 对应的域名或 IP，用于健康检查 Host |
| `ALIYUN_HEALTHCHECK_URL` | Variable | 否 | 默认 `http://127.0.0.1/app.html`；站点强制 HTTPS 时改成 `https://域名/app.html` |

如果修改了 `ALIYUN_APP_DIR`，nginx 的主 `root`、`/assets/` 的 `root`
和容器挂载路径都要同步修改。

推送到 `main` 或 `master` 会自动发布。也可以在 Actions 里选择
`Deploy activity-66 portal to Aliyun`，点击 `Run workflow` 手动发布。

## 本地手动发布

```bash
ALIYUN_HOST=ECS_IP \
ALIYUN_USER=deploy \
ALIYUN_SITE_HOST=activity.example.com \
ALIYUN_SSH_KEY=~/.ssh/activity-66_deploy \
npm run deploy:aliyun
```

本地脚本同样会构建、上传、切软链，并执行健康检查和自动回滚。

## 回滚

查看保留的版本：

```bash
ssh deploy@ECS_IP 'ls -1dt /var/www/activity-66/releases/* | head'
```

切回指定版本：

```bash
ssh deploy@ECS_IP \
  "cd /var/www/activity-66 && ln -sfn releases/<release> current.new && mv -Tf current.new current"
```

默认保留最近 5 个版本。失败的健康检查会自动切回上一个 `current`。

## 常见调整

- 默认触发分支是 `main` 或 `master`。使用其他分支时，修改 workflow 的 `branches`。
- 安全组和服务器防火墙至少放行 22、80、443。部署用户只给 `/var/www/activity-66` 权限，不需要 sudo。
- 如果站点在子路径下，nginx 的 location 和 `ALIYUN_HEALTHCHECK_URL` 都要一起改。
- 已有 HTTPS 证书配置可以复用，不需要让这套流水线管理证书。
- `shared/assets` 会随着发布累积。按活动周期定期清理不再被保留版本引用的文件即可，不要清空正在使用的资源。
