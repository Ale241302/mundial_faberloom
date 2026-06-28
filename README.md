# Mundial FaberLoom · mundial.faberloom.ai

Simulador del Mundial 2026 — **React + Django/DRF + PostgreSQL + Redis/Celery**, IA **Kimi**, correos de marca por **mail.mwt.one**. Proyecto independiente (no toca `faber_loom`).

Diseño replicado 1:1 del *Simulador Mundial 2026 · FaberLoom*; **sin datos quemados** (todo en PostgreSQL vía `seed_tournament`).

Arranque rápido:

```bash
cp .env.example .env   # edita claves + KIMI_API_KEY
docker compose up -d --build
```

Web → `:3300` · API → `:8300/api` · Admin → usuario **admin** / **MuitoWork2026?**

Documentación: **DEPLOY.md** (despliegue) · **cloudflare-email.md** (DNS + correo).
