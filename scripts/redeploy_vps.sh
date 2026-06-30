#!/usr/bin/env bash
# Redeploy de Mundial FaberLoom en el VPS.
# Uso (en el servidor):
#   ssh -p 2222 root@187.77.218.102
#   cd /opt/mundial_faberloom
#   git pull origin main
#   bash scripts/redeploy_vps.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
echo "==> Carpeta: $DIR"

if [ ! -f .env ]; then
  echo "!! Falta .env en $DIR — créalo (copia de .env.example con tus claves) y reintenta."
  exit 1
fi

echo "==> git pull origin main"
git pull origin main || true

echo "==> docker compose build + up -d"
docker compose up -d --build

echo "==> limpieza de imágenes viejas"
docker image prune -f >/dev/null 2>&1 || true

echo "==> recargar proxy mwt-nginx (re-resolver IPs nuevas de los contenedores)"
docker exec mwt-nginx nginx -s reload 2>/dev/null \
  && echo "   proxy recargado" \
  || echo "   (mwt-nginx no encontrado u omitido)"

echo "==> estado"
docker compose ps
echo "==> Listo. Web:3300  API:8300/api/health/"
