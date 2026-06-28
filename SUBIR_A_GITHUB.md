# Subir a GitHub + conectar con el VPS

> ⚠️ La carpeta está en **OneDrive**, y un mount de red **no puede alojar `.git`**
> (da "Operation not permitted"). Por eso trabajamos desde una **carpeta en disco
> local** (ej. `C:\dev\`). Te dejé el commit listo en **`mundial_faberloom.bundle`**.

El bundle YA contiene el commit correcto: **sin `.env`, sin `node_modules`, sin temporales**.
El `.env` (con la API key de Kimi y las claves) queda solo en tu equipo / VPS, nunca en GitHub.

---

## 1. Subir el código a GitHub (desde tu PC, PowerShell)

```powershell
# 1) copia el bundle a una carpeta en disco LOCAL (no OneDrive)
mkdir C:\dev 2>$null
copy "C:\Users\ale13\OneDrive\Documents\apuestas_faberloom\mundial_faberloom\mundial_faberloom.bundle" C:\dev\

# 2) clona desde el bundle
cd C:\dev
git clone mundial_faberloom.bundle mundial_faberloom
cd mundial_faberloom

# 3) apunta el remoto a tu repo y sube
git remote set-url origin https://github.com/Ale241302/mundial_faberloom.git
git push -u origin main
```

Cuando pida credenciales: usuario = `Ale241302`, contraseña = un **Personal Access
Token** (GitHub ya no acepta tu contraseña). Crear token:
GitHub → Settings → Developer settings → **Fine-grained tokens** → repo
`mundial_faberloom`, permiso **Contents: Read and write** → Generate.

> Para futuros cambios trabaja en `C:\dev\mundial_faberloom` (disco local) y
> `git add . && git commit -m "..." && git push`. No edites el código dentro de
> OneDrive para git.

---

## 2. Primer despliegue en el VPS

```bash
ssh -p 2222 root@187.77.218.102
cd /opt
git clone https://github.com/Ale241302/mundial_faberloom.git
cd mundial_faberloom

# crea el .env en el servidor (copia el contenido de tu .env local;
# ya trae la API key de Kimi, SMTP de info@mwt.one y claves)
nano .env        # pega el contenido y guarda

bash scripts/redeploy_vps.sh
```

Comprueba: `curl http://localhost:8300/api/health/` y abre `http://IP:3300`.
Luego en Cloudflare añade el A `mundial` + vhost al puerto 3300 (ver `cloudflare-email.md`).

---

## 3. Auto-deploy: local → GitHub → VPS  (igual que consola-mwt-one)

### Opción A — manual (la que ya usas)
```bash
ssh -p 2222 root@187.77.218.102
cd /opt/mundial_faberloom
git pull origin main
bash scripts/redeploy_vps.sh
```

### Opción B — automático con GitHub Actions
Ya incluí el workflow `.github/workflows/deploy.yml`. Cada `git push` a `main`
entra por SSH al VPS y corre el redeploy solo. Añade en GitHub →
repo → Settings → **Secrets and variables → Actions**:

| Secret        | Valor                          |
|---------------|--------------------------------|
| `VPS_HOST`    | `187.77.218.102`               |
| `VPS_PORT`    | `2222`                         |
| `VPS_USER`    | `root`                         |
| `VPS_SSH_KEY` | tu clave **privada** SSH (la que usas para entrar al VPS) |

Con eso: editas en local → `git push` → se actualiza GitHub → el VPS hace
`git pull` + `docker compose up -d --build` automáticamente.

---

## 4. Notas
- La **API key de Kimi** ya quedó puesta en tu `.env` local (`KIMI_API_KEY=sk-kimi-…`).
  Cópiala al `.env` del VPS. Nunca se sube a GitHub.
- Si prefieres no exponer puertos, deja `mundial-web` (3300) y `mundial-api` (8300)
  solo detrás del nginx del servidor.
- Borra `mundial_faberloom.bundle` cuando ya esté en GitHub (no hace falta versionarlo).
```
