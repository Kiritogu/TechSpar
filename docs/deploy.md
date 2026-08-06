# 生产部署手册(Docker Compose + HTTPS)

目标:在 **Ubuntu / Debian** 服务器上用 Docker Compose 一键跑起来,并通过 **Let's Encrypt HTTPS** 对外提供 `https://<你的域名>/`。

本应用**重度使用麦克风**(语音问答、录音复盘、声纹识别),浏览器只在 HTTPS 或 localhost 下放行 `getUserMedia`,所以生产环境必须配 HTTPS,否则这些功能不可用。

> 部署者**不需要**配任何 LLM/Embedding/DashScope API key。密钥由每个用户登录后在「设置」里自己填,存在 `data/users/<id>/` 下,互不共享。你只需配好管理员账号。

---

## 0. 你需要准备

- 一台公网 Ubuntu/Debian 服务器(至少 2C4G 起步,看使用量)
- 一个域名,并把 **A 记录指向服务器 IP**(如 `yongbo.xyz → 1.2.3.4`),等 DNS 生效(`ping yongbo.xyz` 能返回服务器 IP 即可)
- 域名邮箱一个(收 Let's Encrypt 到期提醒,可选)

---

## 1. 安装 Docker 与 compose 插件

```bash
# 官方源一键安装 docker engine + compose 插件
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# 确认
docker --version
docker compose version
```

> 避免用系统自带的旧 `docker-compose`(Python 版),命令是 `docker compose`(带空格)。

---

## 2. 拿到代码

```bash
git clone <你的仓库地址> offerspar
cd offerspar
```

> 证书目录 `certs/` 与 ACME 目录 `certbot-webroot/` 已在 `.gitignore`,服务器上运行时生成,不会进 git。

---

## 3. 生成生产 `.env`

```bash
cp .env.example .env
```

参考现有 `.env.example`,至少改这几项:

```env
# Auth —— 必须改,不要用默认值
JWT_SECRET=$(openssl rand -base64 48)     # 或手工填一个足够长的随机串
DEFAULT_EMAIL=admin@yongbo.xyz       # 管理员登录邮箱
DEFAULT_PASSWORD=<一个强密码>              # 管理员登录密码
# 是否允许公开注册。false 时只有上面管理员账号能登录(可在设置页“账户”里运行时切换)
ALLOW_REGISTRATION=true
```

> `.env` 已被 git 忽略,不会提交。里面只放引导配置,不放任何 API key。

环境变量里其它可选项(面试轮数等)见 [deployment.md](deployment.md) 与 `.env.example`。

---

## 4. 准备证书目录并启动

```bash
# 1) 先放一个自签占位证书,让 443 的 ssl server 一开始就能起(之后会被真证书替换)
mkdir -p certs certbot-webroot
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -subj "/CN=placeholder" \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem

# 2) 构建并后台启动(frontend 会等 backend 健康后才起)
docker compose up -d --build

# 3) 快速自检
curl -s http://127.0.0.1/api/health      # → {"status":"ok"}
curl -kI https://127.0.0.1/              # → 200(占位证书,带 -k 是正常的)
```

---

## 5. 签发真证书

先装 certbot:

```bash
sudo apt update && sudo apt install -y certbot
```

然后签发(`scripts/issue-certs.sh` 会自动处理占位→真证书的替换并 reload nginx)。certbot 需要 root,整条用 `sudo` 跑:

```bash
sudo DOMAIN=yongbo.xyz EMAIL=admin@yongbo.xyz ./scripts/issue-certs.sh
```

或者分步手打(效果一样):

```bash
sudo certbot certonly --webroot -w ./certbot-webroot -d yongbo.xyz \
  --agree-tos --email admin@yongbo.xyz --no-eff-email
sudo cp -L /etc/letsencrypt/live/yongbo.xyz/fullchain.pem certs/fullchain.pem
sudo cp -L /etc/letsencrypt/live/yongbo.xyz/privkey.pem certs/privkey.pem
docker compose exec frontend nginx -s reload
```

验证:

```bash
curl -I https://yongbo.xyz/          # 200,不再需要 -k
curl -s https://yongbo.xyz/api/health # → {"status":"ok"}(经 nginx 反代)
```

---

## 6. 证书自动续期

Let's Encrypt 证书 90 天过期,挂一条 cron 每天检查(`scripts/renew-certs.sh` 只在真的续期成功时才复制+reload,零停机)。续期写 `/etc/letsencrypt`,同样需要 root,用 **root 的 crontab**:

```bash
sudo crontab -e
# 加一行(改成你的实际路径与域名):
17 3 * * * cd /path/to/offerspar && DOMAIN=yongbo.xyz ./scripts/renew-certs.sh >> /var/log/offerspar-renew.log 2>&1
```

> 第一次部署后可以先跑一次 `sudo certbot renew --dry-run` 验证续期链路可用。
> 如果 apt 装的 certbot 自带 `certbot.timer`,停掉它避免和上面的 cron 抢续期锁:`sudo systemctl disable --now certbot.timer`(没有该服务可跳过)。

---

## 7. 防火墙

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

后端 8000 已在 `docker-compose.yml` 里只绑定 `127.0.0.1`,**不对公网开放**,无需放行。

---

## 8. 首次登录与功能验证

1. 浏览器打开 `https://yongbo.xyz/`,用 `.env` 里的 `DEFAULT_EMAIL / DEFAULT_PASSWORD` 登录。
2. 首登会进入两步引导:**配置你自己的 LLM 服务 + Embedding 服务**(服务商与示例见 [deployment.md](deployment.md))。`.env` 不含任何 key,这步必做。
3. 逐项验证:
   - 首页麦克风授权弹窗正常出现 → 证明 HTTPS 生效
   - 发起一轮面试,文字流式 + 语音播报(TTS)可用
   - 语音模式「说完自动发送」(STT)可用
   - 录音复盘上传一段 >1MB 的音频 → 不会被 nginx 413
   - 登录页若 `ALLOW_REGISTRATION=true`,可注册新账号

---

## 9. 数据备份与恢复

整个应用状态都在 `data/` 目录(sqlite 数据库 + 各用户文件 + LangGraph 检查点),它是 `docker-compose.yml` 挂载的宿主机目录:

```bash
# 备份
tar czf offerspar-backup-$(date +%F).tar.gz data/

# 恢复:解压回同一目录,重启即可
tar xzf offerspar-backup-XXXX-XX-XX.tar.gz
docker compose restart
```

> 建议配一个每日 cron 备份,并把备份拉到本地或对象存储。

---

## 10. 常用运维命令

```bash
docker compose ps                 # 两个容器状态
docker compose logs -f backend    # 看后端日志
docker compose logs -f frontend   # 看 nginx 日志
docker compose pull && docker compose up -d --build   # 更新代码/镜像后重启
docker compose down               # 停(数据仍在 ./data,不删)
```

---

## 常见问题

- **`curl -I https://域名` 报证书错误** → 证书没签发成功,重跑第 5 步;先确认 DNS 已生效、80 端口能访问 `http://域名/.well-known/...`。
- **麦克风授权不弹窗 / 语音不可用** → 访问的是 `http://` 而非 `https://`,或浏览器设置拦截了权限。
- **上传 413** → nginx `client_max_body_size` 已设为 500m,如果还 413,检查是否经过了别的前置反代(如 CDN 有自己的体积上限)。
- **首登没有引导** → 检查管理员是否已完成 LLM/Embedding 配置;未配置时调接口会返回 `provider_not_configured`。
