#!/usr/bin/env bash
# 每日续期 Let's Encrypt 证书(webroot 模式,零停机)。
#
# 只有证书实际续期成功时,deploy-hook 才会触发:把新证书复制到 ./certs 并 reload nginx。
# 没有到期时 certbot renew 直接返回,什么都不动。
#
# crontab 示例(每天 03:17):
#   17 3 * * * cd /path/to/repo && DOMAIN=yongbo.xyz ./scripts/renew-certs.sh >> renew-certs.log 2>&1
set -euo pipefail

DOMAIN="${DOMAIN:-yongbo.xyz}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

command -v certbot >/dev/null || { echo "certbot 未安装,先安装: sudo apt install certbot"; exit 1; }

certbot renew --webroot -w "$ROOT/certbot-webroot" \
  --deploy-hook "cd '$ROOT' && cp -L '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' 'certs/fullchain.pem' && cp -L '/etc/letsencrypt/live/$DOMAIN/privkey.pem' 'certs/privkey.pem' && docker compose exec frontend nginx -s reload || true"

echo "续期检查完成(有续期才复制+reload)"
