Hecho. Audité primero la integración real y construí el panel contra lo que **sí devuelve** la API actual de FIFA, sin inventar estadísticas.

## 1. Reporte corto de revisión

### Encontré

- **Integración FIFA existente**
  - Endpoint actual: `https://api.fifa.com/api/v3/calendar/matches`
  - Params: `idCompetition=17`, `idSeason=285023`, `count=100`, `language=es`.
  - Se ejecutaba por Celery cada **120s** (`CELERY_BEAT_SCHEDULE`) y manualmente desde admin.
  - Antes solo volcaba `Result`: ganador, marcador, `status`, `minute`.
  - Manejo de caída: `requests.raise_for_status()`; en admin devolvía 502, en Celery fallaba la task. No había fallback para UI.

- **Campos reales**
  - La respuesta trae marcador, equipos, fecha, estadio, estado FIFA, minuto, ganador y `BallPossession`.
  - En la consulta real, `BallPossession` vino `null`.
  - No encontré en ese endpoint campos reales de tiros, tiros al arco, córners, faltas, tarjetas ni xG.
  - Por regla: esos campos ahora se renderizan como **`[N/D]`**.

- **Estado general**
  - Captura de correo + idioma existe: `User.lang`, waitlist, registro y landing.
  - El idioma se guardaba en `localStorage`; ahora, si el usuario está logueado, cambiar idioma también hace `PATCH /auth/me/`.
  - Leaderboard existe en `/ranking/`.
  - Re-sim por ronda / resolución existe vía motor `Engine.resolve`, `Result`, `BracketFixture`.
  - Probabilidades por cruce existían en `prob_f`, pero no se mostraban en todas las tarjetas. Ahora cada equipo del cruce muestra su `%`.

- **Gaps reales**
  - El endpoint FIFA conectado **no trae** stats avanzadas útiles salvo `BallPossession`, y actualmente viene nulo.
  - El clasificador anterior consideraba finalizado si había `Winner`, pero `Winner` en FIFA viene como id interno de equipo; ajusté la clasificación a `MatchStatus`.
  - El admin al cargar resultado sobre un partido que estuviera `live` podía dejar `status=live`; ahora fuerza `status="finished"`.
  - Hay secretos reales en archivos de entorno del repo local. No los repetí, pero conviene rotarlos y sacarlos del árbol versionado si alguna vez se subieron.

## 2. Campos FIFA mapeados al panel

Endpoint auditado: `/calendar/matches`.

Campos top-level observados incluyen: `IdMatch`, `MatchNumber`, `IdStage`, `Date`, `LocalDate`, `Home`, `Away`, `HomeTeamScore`, `AwayTeamScore`, `HomeTeamPenaltyScore`, `AwayTeamPenaltyScore`, `MatchStatus`, `MatchTime`, `Winner`, `Stadium`, `StageName`, `GroupName`, `Weather`, `Attendance`, `BallPossession`, `Officials`, `Properties`.

Mapeo usado:

| Panel | Campo FIFA |
|---|---|
| Equipos | `Home.TeamName`, `Away.TeamName`, fallback `Abbreviation` |
| Banderas | nombre interno del equipo + `flags.js` |
| Marcador | `HomeTeamScore` / `AwayTeamScore`, fallback `Home.Score` / `Away.Score` |
| Estado | `MatchStatus`: `0 = finished`, `1 = scheduled`, otro/marcador sin final = `live` |
| Minuto | `MatchTime` |
| Fecha / countdown | `Date` / `LocalDate` |
| Estadio / ciudad | `Stadium.Name`, `Stadium.CityName` |
| Ganador | marcador + penales; `Winner` solo se conserva como señal, no se usa para inventar nombre |
| Ronda interna | `IdStage` vía `STAGE_ROUND` |
| Posesión | `BallPossession`, pero si viene `null` => `[N/D]` |
| Tiros | no está en respuesta auditada => `[N/D]` |
| Tiros al arco | no está en respuesta auditada => `[N/D]` |
| Córners | no está en respuesta auditada => `[N/D]` |
| Faltas | no está en respuesta auditada => `[N/D]` |
| Tarjetas | no está en respuesta auditada => `[N/D]` |
| xG | no está en respuesta auditada => `[N/D]` |

En la consulta real que corrí, no había partido `in_play`; el panel cae al próximo partido y último resultado.

## 3. Implementado

### Backend

- `backend/tournament/fifa.py`
  - Agregué `get_live_panel()`.
  - Detecta partido live automáticamente.
  - Si no hay live, devuelve:
    - `next_match`
    - `last_result`
  - Cache corto:
    - `LIVE_CACHE_TTL = 45s`
    - refresh sugerido `60s`
  - Fallback stale y fallback local DB si FIFA cae.
  - Mapea stats ausentes a `null` para que front pinte `[N/D]`.
  - Incluye `field_map` y `api_fields` para auditar qué se usó.

- `backend/tournament/views.py`
  - Nuevo endpoint liviano:
    - `GET /api/live/`
  - Devuelve:
    - `live_panel`
    - `results`
    - `prob_f`
    - `ai_picks`
    - `ai_points`
    - `state`
    - `overrides`
    - `closed_matches`
  - Esto permite polling sin recalcular Monte Carlo completo.

- `backend/tournament/urls.py`
  - Agregado `path("live/", views.live_state)`.

- `backend/config/settings.py`
  - Cache para panel FIFA:
    - Redis si hay `REDIS_URL`.
    - LocMem si no.

### Frontend

- Nuevo componente:
  - `frontend/src/components/LivePanel.jsx`

Muestra:

- Badge `● EN VIVO` + minuto si hay partido live.
- Si no hay live:
  - Próximo partido + cuenta regresiva.
  - Último resultado.
- Equipos + banderas.
- Marcador.
- Línea clave “vos vs la IA”:
  - Ej: `La IA daba 75% a Brasil — va 0-1`
  - Para próximo: `La IA da 75% a Brasil antes del partido`
- Stats disponibles:
  - Posesión si FIFA la trae.
  - Todo campo ausente: `[N/D]`.
- Última actualización.
- Si el partido afecta el pick del usuario, muestra:
  - `Este resultado mueve tu predicción.`
- i18n ES/EN/FR agregado en `frontend/src/lib/i18n.js`.

### Auto-refresh

- `frontend/src/lib/store.jsx`
  - Agregué `livePanel`.
  - Polling a `/api/live/` cada 30–90s, usando `refresh_seconds` del backend.
  - Actualiza `results`, `prob_f`, `ai_picks` y motor cliente sin recargar todo el bootstrap pesado.

### Probabilidad por cruce

- `frontend/src/components/MatchCard.jsx`
  - Ahora cada lado del cruce muestra su probabilidad IA (`P%`) también en vista normal, no solo compacta.
  - Se actualiza al refrescar `/api/live/`, porque `prob_f/results` y el engine cliente se reemplazan con el estado nuevo.

## 4. Validación

Corrí:

- `python -m py_compile backend/tournament/fifa.py backend/tournament/views.py backend/tournament/urls.py`
- `DB_SQLITE=True python backend/manage.py check`
- `npm install`
- `npm run build`

Resultado:

- Backend check OK.
- Frontend build OK.
- Probé `GET /api/live/` local con Django test client: respondió `200` y devolvió `live_panel`, `prob_f`, `results`, etc.

Nota: `npm install` reportó 2 vulnerabilidades existentes en dependencias y warnings de cleanup por archivos temporales en `.bin`, pero el build final compiló correctamente.