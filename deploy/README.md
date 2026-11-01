# 部署说明（宝塔面板）

纯静态站，全程只在宝塔里**新增一个站点**，不改任何 nginx 配置、不装 Docker、
不装 Node、不装 certbot。

站点根目录就是：

```text
/verifly/activity-66-portal
```

CI 构建完把 `dist/` 直接 rsync 到这个目录（带 `--delete`），就这一个目录，
里面直接是 `index.html`、`assets/`。发布完刷新就是新版本。

## 一、宝塔新增站点

网站 → 添加站点：

| 项目 | 填什么 |
| --- | --- |
| 域名 | `66thandsecondlovehealgiveus.com`、`www.66thandsecondlovehealgiveus.com` |
| 根目录 | `/verifly/activity-66-portal` |
| PHP 版本 | 纯静态 |
| 数据库 / FTP | 都不建 |

宝塔建站点时会往这个目录放一个默认的 `index.html`，第一次发布会把它覆盖掉，
属于正常现象。

如果这台机器上还有别的站点占着这个域名，去那个站点里把域名解绑掉（点界面
就行，别改它的配置），否则宝塔会提示域名已绑定。

## 二、服务器上建部署用户

SSH 登录服务器执行这几行。`deploy` 只用来收文件，不给 root：

```bash
useradd --create-home --shell /bin/bash deploy
chown -R deploy:deploy /verifly/activity-66-portal
chmod 755 /verifly/activity-66-portal
```

`deploy` 只用来往这个目录写文件，不给 root。宝塔的 nginx 用 www 用户读，
目录 755、文件 644 就够。

## 三、本地生成密钥

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/activity-66_deploy -N ""
ssh-copy-id -i ~/.ssh/activity-66_deploy.pub deploy@ECS_IP
```

## 四、GitHub 配置

Settings → Secrets and variables → Actions，只加两个 secret：

| 名称 | 值 |
| --- | --- |
| `ALIYUN_HOST` | ECS 公网 IP |
| `ALIYUN_SSH_KEY` | 部署私钥全文（`~/.ssh/activity-66_deploy`） |

用户名固定 `deploy`、端口固定 `22`、站点目录固定 `/verifly/activity-66-portal`，
都写在 workflow 里，不用再配。命中过的 host key 会被接受，所以也不需要
`known_hosts`。

可选：想让 workflow 发布完顺便检查线上，就加一个 variable
`ALIYUN_PUBLIC_URL` = `https://66thandsecondlovehealgiveus.com`。不加就跳过这步，
不影响发布。

## 五、跑第一次发布

手动运行 `Deploy portal to Aliyun ECS`。它只做两件事：构建，然后把 `dist/`
覆盖到 `/verifly/activity-66-portal`。静态文件不需要 reload nginx，nginx 每次
请求都直接读磁盘。

跑完目录里就是构建好的 `index.html`、`app.html`、`apply.html`、`assets/` 和
`REVISION`。此时访问 `http://ECS_IP/` 就能看到完整页面，表单和上传都能在
这一步先验一遍。

## 六、宝塔里开 HTTPS

站点设置 → SSL → Let's Encrypt → 申请 → 打开**强制 HTTPS**。

宝塔会自己写续期任务。申请时域名必须已经解析到这台机器，否则验证过不了。

## 七、验证

```bash
curl -sI https://66thandsecondlovehealgiveus.com/apply.html
curl -s  https://66thandsecondlovehealgiveus.com/REVISION
```

第一个返回 200，第二个输出最新 commit。配了 `ALIYUN_PUBLIC_URL` 之后，workflow
每次发布都会自动比对这两项，不一致就标红失败。

## 八、日常发布和回滚

发布就是 push main。

回滚在 GitHub 上做：Actions → 找到上一次成功的 `Deploy portal to Aliyun ECS`
→ Re-run all jobs。它会用那次的 commit 重新构建并覆盖上去，几十秒就好。

服务器上不留历史版本，所以别在这个目录里手动放别的东西，`--delete` 会清掉
目标目录里构建产物之外的文件。

## 注意

- 服务器需要有 `rsync`，宝塔机器一般自带；没有的话 `apt install rsync`。
- 根目录填 `/verifly/activity-66-portal`，别填成 `/verifly`，那样会读到上层目录，首页 404。
- 切换完成后把域名从 GitHub Pages 解绑，并删掉 `.github/workflows/pages.yml`，
  免得同一个域名有两份在线内容。
