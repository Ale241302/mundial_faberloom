# Mundial FaberLoom — Despliegue

Proyecto **independiente** (no toca `faber_loom`). Stack: **React (Vite) + Django/DRF + PostgreSQL + Redis/Celery**, IA **Kimi**, correo vía **mail.mwt.one**.

Diseño replicado 1:1 del *Simulador Mundial 2026 · FaberLoom*. **Sin datos quemados**: equipos, cruces, mercado y estadísticas viven en PostgreSQL (se cargan con `seed_tournament`).

```
mundial_faberloom/
├─ backend/        Django + DRF (API, motor Elo/Montecarlo, correos, Kimi)
│  ├─ config/      settings, urls, celery
│  ├─ accounts/    usuario, login/registro, reset con token firmado
│  ├─ tournament/  modelos, motor, API, admin, seed_tournament
│  ├─ emails/      service.py + templates/emails/*.html  (+ preview/)
│  └─ seed/        wc_data.json, i18n.json
├─ frontend/       React + framer-motion (cuadro, modales, admin, i18n)
├─ docker-compose.yml
├─ .env.example
└─ cloudflare-email.md
```

## 1. Local / servidor con Docker

```bash
cd mundial_faberloom
cp .env.example .env         # edita SECRET_KEY, claves y KIMI_API_KEY
docker compose up -d --build
```

- Web: http://SERVIDOR:3300  (en prod, detrás de `mundial.faberloom.ai`)
- API: http://SERVIDOR:8300/api/health/
- El contenedor `mundial-api` corre migraciones + `seed_tournament` solo (entrypoint).

Admin: usuario **admin** · clave **MuitoWork2026?** (cámbiala en `.env` antes del primer arranque, o desde el panel).

## 2. Sin Docker (dev)

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DB_SQLITE=1 SECRET_KEY=dev DEBUG=1        # sqlite para probar rápido
python manage.py migrate && python manage.py seed_tournament
python manage.py runserver 0.0.0.0:8200
```
Frontend:
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173  (proxy /api → :8200)
```

## 3. Cloudflare + dominio + correo
Ver **cloudflare-email.md** (registro A `mundial`, vhost al puerto 3300, correo).

## 4. Funcionalidades clave
- **Cuadro** completo (R32→Final) con conectores, hover de probabilidad, predicción de marcador y desempate por penales.
- **Tú vs la IA**: la IA = motor Montecarlo/Elo; puntaje con multiplicador de sorpresa ×3.
- **Auth**: registro, login (alias `admin`), **reset por correo** con enlace corto firmado → abre modal *nueva contraseña + repetir* en el sitio. (Se quitó la pista "MuitoWork2026?" del modal.)
- **Correos** HTML de marca: bienvenida, pronóstico y reset (vista previa en `backend/emails/preview/`).
- **IA Kimi**: proyecciones de cruce y dossier (botón "↻ Proyección Kimi"); requiere `KIMI_API_KEY`.
- **Admin**: usuarios (activar/eliminar/reset clave), abrir/cerrar etapas, cargar resultados reales.

## 5. Operación del torneo (admin)
1. Entra como admin → **Panel admin**.
2. Pestaña **Resultados** → *Ir a cargar resultados* → en el cuadro, modo Resultados, marca el ganador real de cada cruce (y opcional el marcador). Los puntos de todos se recalculan.
3. Pestaña **Etapas**: abre/cierra apuestas por ronda.
