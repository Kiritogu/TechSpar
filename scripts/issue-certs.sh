#!/usr/bin/env bash
# 首次签发 Let's Encrypt 证书(webroot 模式,零停机)。
#
# 前置条件:
#   1. docker compose up -d --build 已成功,80/443 已监听(nginx 容器已起)
#   2. 域名已解析到本机(DNS A 记录生效),certbot 才能完成 HTTP-01 验证
#   3. certbot 已安装(sudo apt install certbot)
#
# 用法:
#   DOMAIN=yongbo.xyz ./scripts/issue-certs.sh
#   DOMAIN=yongbo.xyz EMAIL=admin@example.com ./scripts/issue-certs.sh
#
# 说明:
#   - 先放一个自签占位证书到 ./certs,让 443 的 ssl server 一开始就能起;
#   - 再用 certbot 走 webroot(./certbot-webroot 已由 nginx 容器挂载)签发真证书;
#   - 最后把真证书(解引用符号链接)复制到 ./certs,reload nginx。
set -euo pipefail

DOMAIN="${DOMAIN:-yongbo.xyz}"
EMAIL="${EMAIL:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p certs certbot-webroot

if [[ ! -f certs/fullchain.pem || ! -f certs/privkey.pem ]]; then
  echo ">> 生成自签占位证书(让 443 先能起,之后被真证书替换)"
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -subj "/CN=placeholder" \
    -keyout certs/privkey.pem \
    -out certs/fullchain.pem
fi

command -v certbot >/dev/null || { echo "certbot 未安装,先安装: sudo apt install certbot"; exit 1; }

ARGS=(certonly --webroot -w "$ROOT/certbot-webroot" -d "$DOMAIN" --agree-tos --no-eff-email)
if [[ -n "$EMAIL" ]]; then
  ARGS+=(--email "$EMAIL")
fi

echo ">> 签发证书: certbot ${ARGS[*]}"
certbot "${ARGS[@]}"

echo ">> 复制真证书到 ./certs(解引用符号链接)"
cp -L "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" certs/fullchain.pem
cp -L "/etc/letsencrypt/live/$DOMAIN/privkey.pem" certs/privkey.pem
chmod 644 certs/fullchain.pem
chmod 600 certs/privkey.pem

echo ">> reload nginx"
docker compose exec frontend nginx -s reload || docker compose restart frontend

echo "完成: https://$DOMAIN 证书已就绪"
