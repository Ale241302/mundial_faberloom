# Cloudflare DNS + correo — mundial.faberloom.ai

Cuenta Cloudflare: zona **faberloom.ai** · Servidor: **187.77.218.102**

---

## 1. Publicar el sitio en `mundial.faberloom.ai`

Añade en **DNS → Records** de faberloom.ai:

| Tipo  | Nombre    | Contenido          | Proxy        | TTL  |
|-------|-----------|--------------------|--------------|------|
| A     | `mundial` | `187.77.218.102`   | 🟠 Proxied   | Auto |

Luego, en tu reverse proxy del servidor (el `mwt-nginx` que ya escucha 80/443),
añade un vhost que enrute `mundial.faberloom.ai` al contenedor **mundial-web**:

```nginx
server {
    server_name mundial.faberloom.ai;
    location / {
        proxy_pass http://127.0.0.1:3300;   # mundial-web (3300:3000)
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> El contenedor `mundial-web` ya hace proxy interno de `/api` → `mundial-api`,
> así que el frontend y el backend quedan bajo el mismo dominio. Los enlaces
> de los correos (`/reset/<token>`) funcionan porque el SPA captura esa ruta.

Certificado TLS: con Cloudflare *Proxied* + modo **Full (strict)** ya tienes HTTPS.

---

## 2. Correo

El sistema **envía** los correos (bienvenida, pronóstico, reset) a través de tu
SMTP existente **mail.mwt.one** con la cuenta `info@mwt.one`. El remitente que ve
el usuario es **“Mundial FaberLoom” <info@mwt.one>**.

### 2.1 Opción recomendada (ya configurada en el código)
No necesitas tocar el DNS de faberloom.ai para *enviar*: la alineación SPF/DKIM/
DMARC se evalúa sobre **mwt.one** (tu dominio de envío). Solo asegúrate de que
**mwt.one** tenga sus registros de correo en orden (lo normal si ya envías desde
ahí). Para verificar, manda un correo de prueba a una cuenta Gmail y revisa
*“Mostrar original”*: SPF=pass, DKIM=pass, DMARC=pass.

### 2.2 Opción avanzada — enviar DESDE `@mundial.faberloom.ai`
Si más adelante quieres que el remitente sea `no-reply@mundial.faberloom.ai`,
añade en Cloudflare (faberloom.ai) estos registros y cambia
`DEFAULT_FROM_EMAIL` en `.env`. Sustituye los valores DKIM por los que te dé
el panel de mail.mwt.one (mailcow/postfix):

| Tipo | Nombre                          | Contenido                                                        |
|------|---------------------------------|-----------------------------------------------------------------|
| MX   | `mundial`                       | `mail.mwt.one` (prioridad 10)                                    |
| TXT  | `mundial`                       | `v=spf1 a mx include:mwt.one ~all`                               |
| TXT  | `dkim._domainkey.mundial`       | `v=DKIM1; k=rsa; p=<CLAVE_PUBLICA_DKIM_DE_MAIL.MWT.ONE>`         |
| TXT  | `_dmarc.mundial`                | `v=DMARC1; p=quarantine; rua=mailto:dmarc@faberloom.ai; adkim=s; aspf=s` |

> ⚠️ Para 2.2 el servidor mail.mwt.one debe estar configurado para firmar como
> `mundial.faberloom.ai` (añadir el dominio y generar su DKIM). Sin eso, usa 2.1.

### 2.3 Recibir correo en `@faberloom.ai` (aviso de Cloudflare)
El aviso *“Email cannot reach @faberloom.ai”* es porque no hay MX en la raíz.
Si solo te interesa **enviar** (no recibir), puedes ignorarlo. Si quieres recibir,
la vía más simple es **Cloudflare Email Routing** (Email → Email Routing →
habilitar; crea MX automáticos y reenvía a tu Gmail).

---

## 3. Checklist
- [ ] A `mundial` → 187.77.218.102 (Proxied)
- [ ] vhost `mundial.faberloom.ai` → `127.0.0.1:3300`
- [ ] `.env` con `EMAIL_HOST_PASSWORD` de info@mwt.one y `PUBLIC_SITE_URL=https://mundial.faberloom.ai`
- [ ] correo de prueba (registro) llega y no cae en spam
- [ ] enlace de reset abre el modal de nueva contraseña en el sitio
