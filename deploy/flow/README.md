# 云效 Flow 部署（ACR + 主机组）

这条链路把发布交给云效流水线执行，ECS 上只装一个出网即可的 Runner，
不需要对公网开放 SSH。

```text
GitHub / Codeup  push main
  -> 云效 Flow 流水线
  -> 在构建集群 docker build（deploy/flow/Dockerfile）
  -> 推送镜像到 ACR
  -> 主机 Docker 部署：Runner 在 ECS 上执行 deploy-on-host.sh
  -> docker pull + docker compose up -d
  -> 容器健康检查，失败回滚到上一个镜像
```

和 `.github/workflows/deploy-aliyun.yml` 相比，区别只有两处：

- 镜像不从 GitHub 打包传输，而是先推到 ACR，再由 ECS 拉取。
- 部署命令不是在 GitHub 上通过 SSH 执行，而是由 ECS 上的 Runner 拉取任务后执行。

两者都会操作同一个容器 `activity-66-portal`，**同一时间只能启用一条链路**。

## 仓库里已经准备好什么

| 文件 | 作用 |
| --- | --- |
| `deploy/flow/Dockerfile` | 多阶段镜像：容器内执行 `npm ci` 和 `npm run build`，产出 nginx 站点镜像 |
| `deploy/flow/deploy-on-host.sh` | Flow「主机 Docker 部署」里粘贴的部署脚本 |

`deploy/flow/Dockerfile` 自带构建步骤，所以流水线里不需要先跑一次 Node 构建、
也不需要在作业之间传 `dist/` 制品，只需要一个「镜像构建并推送至 ACR」步骤。

Compose 文件和 `.env` 由部署脚本在 ECS 上生成到 `/opt/activity-66`，
不需要手工上传。

## 一次性准备

### 1. 确认云效站点类型

云效分「中心站」和「地域站」。GitHub 作为代码源需要地域站支持；
如果你的组织在中心站，就在 Codeup 里新建仓库并推一份代码过去，
流水线源改用 Codeup（其他步骤完全一样）。

### 2. 开通 ACR 并建仓库

在容器镜像服务控制台开通一个实例（个人版即可），然后创建：

- 命名空间：例如 `activity-66`
- 仓库名：`activity-66-portal`

记下实例的 registry 域名，例如 `registry.cn-hangzhou.aliyuncs.com`。
镜像地址形如：

```text
registry.cn-hangzhou.aliyuncs.com/activity-66/activity-66-portal:20261027-1530
```

如果要让 ECS 拉私有镜像，创建一个只授权该命名空间读写的 RAM 用户，
并在 ACR 里设置该用户的固定密码。RAM 用户的 AccessKey 不要写进仓库。

### 3. 创建服务连接

在云效「全局设置 → 服务连接」里新建：

| 名称建议 | 类型 | 用途 |
| --- | --- | --- |
| `github-activity-66` | GitHub | 拉取代码并接收 push 事件 |
| `acr-activity-66` | 容器镜像服务 | 推送镜像到 ACR |

### 4. 建主机组并接入 ECS

「全局设置 → 主机组管理 → 新建主机组」，然后「接入新主机」，
把生成的安装命令在 ECS 上以 root 执行。前提条件：

- ECS 能访问公网，用于安装 Runner 和接收部署任务；
- ECS 能访问 ACR 的 registry 域名，用于拉取镜像。

Runner 安装完成后主机状态应显示「正常」。安全组不再需要放行 22 给任何人。

### 5. ECS 上装 Docker

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 curl
sudo systemctl enable --now docker
docker compose version
```

Alibaba Cloud Linux / CentOS：

```bash
sudo dnf install -y docker curl
sudo systemctl enable --now docker
docker compose version
```

如果发行版没有 Compose v2，按 Docker 官方文档补装插件。

## 流水线配置

新建一条空流水线，按下面三个环节配置。

### 1. 流水线源

- 代码源：GitHub（或 Codeup）
- 仓库：`verifly-team/activity-66-portal`
- 默认分支：`main`
- 开启「代码源触发」，监听 push

### 2. 镜像构建并推送至 ACR

| 配置项 | 值 |
| --- | --- |
| 服务连接 | `acr-activity-66` |
| 地域 / 实例 | 你创建的 ACR 实例 |
| 仓库 | `activity-66/activity-66-portal` |
| Dockerfile 路径 | `deploy/flow/Dockerfile` |
| 构建上下文 | 仓库根目录 |
| 标签 | `${DATETIME}` |

标签不要固定写 `latest`：每次发布要有唯一标签，回滚才有意义。

### 3. 主机 Docker 部署

- 主机组：上一步创建的主机组
- 执行用户：`root`
- 部署时下载制品：关闭（这条链路只传镜像地址，不传文件）
- 部署脚本：粘贴 `deploy/flow/deploy-on-host.sh` 的全部内容

脚本读取的变量：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `PORTAL_IMAGE` | 是 | 镜像构建步骤的输出，例如 `${registry}/${namespace}/activity-66-portal:${DATETIME}` |
| `ACR_REGISTRY` | 私有镜像必填 | 例如 `registry.cn-hangzhou.aliyuncs.com` |
| `ACR_USERNAME` | 私有镜像必填 | ACR 登录用户名 |
| `ACR_PASSWORD` | 私有镜像必填 | ACR 固定密码，配置为**保密变量** |
| `APP_DIR` | 否 | 默认 `/opt/activity-66` |
| `HTTP_PORT` | 否 | 默认 `80` |
| `HTTP_BIND` | 否 | 默认 `0.0.0.0`；放在宿主机 nginx 后面时改成 `127.0.0.1` |
| `HEALTHCHECK_URL` | 否 | 默认 `http://127.0.0.1:<HTTP_PORT>/app.html` |
| `KEEP_IMAGES` | 否 | 默认保留最近 3 个镜像 |

变量在流水线编辑页的「变量与缓存 → 变量」里新建，`ACR_PASSWORD` 勾选保密。

## 切换到 Flow 之后

1. 删除 GitHub 仓库里的 `ALIYUN_HOST`、`ALIYUN_USER`、`ALIYUN_SSH_KEY`
   三个 Secret，Actions 的 `deploy` 作业会自动跳过，只保留构建和镜像校验。
2. ECS 安全组里关掉对公网的 22 端口（如果还有别的用途，至少限制来源 IP）。
3. 确认容器只有一个在跑：

```bash
docker ps --filter name=activity-66-portal --format '{{.Names}} {{.Image}} {{.Status}}'
```

## 回滚

部署脚本在容器启动失败或健康检查失败时，会把 `.env` 里的镜像地址改回上一个，
再执行一次 `docker compose up -d`。

手工回滚：

```bash
cd /opt/activity-66
docker image ls --filter 'label=com.activity-66.portal=true'
# 把 PORTAL_IMAGE 改成目标镜像后
docker compose up -d
```

也可以在 Flow 里直接重新运行某一次成功的历史发布。

## 临时站点清理

```bash
cd /opt/activity-66
docker compose down --rmi all --remove-orphans
rm -rf -- /opt/activity-66
```

控制台上再删掉：Flow 流水线、主机组里的这台 ECS、ACR 命名空间、服务连接。
主机组只解绑主机，不会卸载 Runner，需要时在 ECS 上手工卸载。

## 目前还缺的（需要你确认或操作）

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 云效组织是地域站还是中心站 | 待确认 | 中心站不支持 GitHub 代码源，需改用 Codeup |
| ACR 是否已开通 | 待确认 | 需要实例 + 命名空间 + 仓库 |
| ACR 登录凭证 | 待配置 | RAM 用户固定密码，存成保密变量 |
| GitHub / Codeup 服务连接 | 待创建 | 需要仓库读权限 |
| ACR 服务连接 | 待创建 | 需要镜像推送权限 |
| 主机组 + Runner | 待创建 | ECS 出网即可，无需公网 SSH |
| ECS 上的 Docker Compose v2 | 待确认 | `docker compose version` 能输出版本 |
| 域名 / 证书 | 可选 | 只影响对外访问方式，不影响流水线 |
