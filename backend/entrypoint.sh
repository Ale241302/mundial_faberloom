#!/bin/sh
set -e

echo "→ Esperando a Postgres…"
python - <<'PY'
import os, time, psycopg2
for _ in range(40):
    try:
        psycopg2.connect(
            dbname=os.environ.get("POSTGRES_DB","mundial"),
            user=os.environ.get("POSTGRES_USER","mundial"),
            password=os.environ.get("POSTGRES_PASSWORD","mundial"),
            host=os.environ.get("POSTGRES_HOST","mundial-db"),
            port=os.environ.get("POSTGRES_PORT","5432"),
        ).close()
        print("Postgres listo."); break
    except Exception as e:
        print("…", e); time.sleep(2)
PY

echo "→ Migraciones"
python manage.py migrate --noinput
echo "→ Archivos estáticos"
python manage.py collectstatic --noinput || true
echo "→ Seed (equipos, cruces, mercado, admin)"
python manage.py seed_tournament || true

echo "→ Gunicorn"
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
