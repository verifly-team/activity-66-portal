# 阿里云 ECS Docker 镜像发布

这是一个适合临时网站的镜像部署方案。GitHub Actions 构建静态站和 Docker
镜像，把压缩镜像通过 SSH 传到 ECS，再用 Docker Compose 启动。

不使用阿里云 ACR，因此不需要 Registry 地址、命名空间或镜像仓库密码。

```text
push main / 手动运行
  -> npm ci
  -> npm run build
  -> docker build activity-66-portal:<release>
  -> docker save | gzip
  -> rsync 到 ECS
  -> docker load
  -> docker compose up -d
  -> 容器健康检查
  -> 失败时恢复上一个镜像
```

镜像本身包含 `dist/` 和 nginx 配置。线上不再使用静态软链目录。

## GitHub 配置

在仓库的 Settings -> Secrets and variables -> Actions 中配置。

Secrets：

| 名称 | 必填 | 说明 |
| --- | --- | --- |
| `ALIYUN_HOST` | 是 | ECS 公网 IP 或域名 |
| `ALIYUN_USER` | 是 | 建议使用专用的 `deploy` 用户 |
| `ALIYUN_SSH_KEY` | 是 | 部署私钥的完整内容 |
| `ALIYUN_PORT` | 否 | SSH 端口，默认 `22` |
| `ALIYUN_KNOWN_HOSTS` | 否 | 推荐固定 ECS 主机指纹 |

Variables：

| 名称 | 默认值 | 说明 |
| --- | --- | --- |
| `ALIYUN_APP_DIR` | `/opt/activity-66` | ECS 上的 Compose 目录 |
| `ALIYUN_HTTP_PORT` | `80` | 容器映射到宿主机的端口 |
| `ALIYUN_HTTP_BIND` | `0.0.0.0` | 映射监听地址 |
| `ALIYUN_DOCKER_PLATFORM` | `linux/amd64` | ECS 是 ARM 时改为 `linux/arm64` |
| `ALIYUN_HEALTHCHECK_URL` | 空 | 默认检查 `http://127.0.0.1:<port>/app.html` |

如果三个必填 Secret 没有配置完整，Actions 仍会构建并保留 `dist` 产物，
并在临时端口启动容器做冒烟测试，但会跳过 ECS 部署。

## ECS 一次性准备

以下命令按 Linux ECS 编写。`/opt/activity-66` 可以通过
`ALIYUN_APP_DIR` 修改。

### 1. 创建部署用户

```bash
id deploy >/dev/null 2>&1 || \
  sudo useradd --create-home --shell /bin/bash deploy
sudo mkdir -p /opt/activity-66/incoming
sudo chown -R deploy:deploy /opt/activity-66
```

部署用户只用于写入 Compose 文件和接收镜像，不需要 sudo。

### 2. 安装 Docker

Ubuntu 或 Debian：

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 rsync curl gzip
sudo systemctl enable --now docker
```

Alibaba Cloud Linux、CentOS 或 RHEL：

```bash
sudo dnf install -y docker rsync curl gzip
sudo systemctl enable --now docker
```

确认 Docker Compose v2 可用：

```bash
docker compose version
```

如果发行版没有 Compose 插件，按 Docker 官方的 Compose v2 安装方式补充。

把部署用户加入 Docker 组：

```bash
sudo usermod -aG docker deploy
```

修改组后需要重新登录，`deploy` 用户才能直接运行 Docker。

### 3. 配置 SSH

在本地生成专用密钥：

```bash
ssh-keygen -t ed25519 -C "github-actions-activity-66" \
  -f ~/.ssh/activity-66_deploy -N ""
ssh-copy-id -i ~/.ssh/activity-66_deploy.pub deploy@ECS_IP
```

把私钥内容写入 GitHub Secret `ALIYUN_SSH_KEY`：

```bash
pbcopy < ~/.ssh/activity-66_deploy
```

主机指纹可以这样生成并写入 `ALIYUN_KNOWN_HOSTS`：

```bash
ssh-keyscan -p 22 -H ECS_IP
```

### 4. 放行端口

ECS 安全组需要放行 SSH 端口。站点直接对外时再放行：

- `80`：HTTP
- `443`：HTTPS，使用域名和证书时

如果 Docker 放在已有宿主机 nginx 后面，可以只把 Docker 端口映射到
`127.0.0.1:8080`，外部只开放 nginx 的 80/443。

## 第一次部署

Secrets 和 Variables 配置完成后，在 GitHub Actions 中选择：

```text
Deploy activity-66 portal image to Aliyun
-> Run workflow
```

也可以直接推送 `main`。

成功后 ECS 上会有：

```text
/opt/activity-66/
  docker-compose.yml
  .env
```

运行的容器是：

```text
activity-66-portal
```

查看状态：

```bash
ssh deploy@ECS_IP \
  'cd /opt/activity-66 && docker compose ps'
ssh deploy@ECS_IP \
  'docker inspect --format "{{.State.Health.Status}}" activity-66-portal'
```

## 已有 nginx 反向代理

宿主机 nginx 可以这样转发到 Docker：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

对应配置：

```text
ALIYUN_HTTP_BIND=127.0.0.1
ALIYUN_HTTP_PORT=8080
```

如果 nginx 本身也在 Docker 容器里，需要使用宿主机网关或共享 Docker
网络访问站点容器，不能直接使用容器内部的 `127.0.0.1`。

## 本地手动发布

```bash
ALIYUN_HOST=ECS_IP \
ALIYUN_USER=deploy \
ALIYUN_SSH_KEY=~/.ssh/activity-66_deploy \
ALIYUN_HTTP_PORT=80 \
npm run deploy:aliyun
```

本地 Mac 默认构建 `linux/amd64` 镜像。ECS 是 ARM 时设置：

```bash
ALIYUN_DOCKER_PLATFORM=linux/arm64 npm run deploy:aliyun
```

## 回滚

每次部署都会把当前镜像写入 `.env`。容器启动或健康检查失败时，脚本会自动
恢复上一个镜像。ECS 默认只保留最近 3 个版本，避免临时站点反复部署后
长期占用磁盘。镜像都带有：

```text
com.activity-66.portal=true
```

可以查看镜像：

```bash
ssh deploy@ECS_IP 'docker image ls activity-66-portal'
```

## 临时站点清理

确认不再需要站点后，执行：

```bash
ssh deploy@ECS_IP
cd /opt/activity-66
docker compose down --rmi all --remove-orphans
docker image prune -a --force --filter label=com.activity-66.portal=true
cd /
rm -rf -- /opt/activity-66
```

这样会停止容器、删除当前镜像和旧版本镜像，并清掉 Compose 文件。ECS 上
如果另有共享 nginx 或域名，再单独删除对应的反向代理配置和 DNS 记录。
