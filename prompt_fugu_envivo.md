# PROMPT — Revisar la herramienta + panel de partido en vivo (FIFA API)

## Contexto
mundial.faberloom.ai — simulador del Mundial 2026 (motor Elo + Monte Carlo, juego "ganale a la IA", captura de correos). Ya está conectado a la API de la FIFA. Quiero aprovechar esa conexión para mostrar las estadísticas en vivo del partido que se está jugando en este momento.

## Paso 0 — Revisá la herramienta primero (no asumas)
Abrí y auditá el código real del simulador antes de tocar nada:

- La integración FIFA: qué endpoints consume hoy, qué campos devuelve realmente la respuesta (marcador, minuto, estado, posesión, tiros, xG, tarjetas…), cada cuánto refresca, cómo maneja caídas. Esto define qué se puede mostrar — construí contra lo que la API realmente trae, no contra lo ideal.
- Estado general: captura de correo + idioma, leaderboard, re-sim por ronda, probabilidades por cruce.
- Reportá los gaps reales. Si algo está roto o a medias, decilo, no lo silencies.

## Feature — Panel "EN VIVO"
Sección destacada arriba del simulador que muestra el partido en juego en este momento:

- Detección automática: consultá la API FIFA y encontrá el partido con estado in-play. Si hay uno en vivo, mostrá el panel prominente con badge "● EN VIVO" y minuto.
- Datos del partido en vivo: equipos + banderas, marcador, y las stats que la API efectivamente devuelva — posesión, tiros, tiros al arco, córners, faltas, tarjetas, xG. Campo que la API no traiga = [N/D], nunca inventado.
- Gancho "vos vs la IA": al lado del marcador, la probabilidad pre-partido que dio la IA vs cómo va — ej. "La IA daba 64% a Brasil — va 0-1". Esto es lo que conecta la data en vivo con el juego entero; es la parte importante.
- Auto-refresh (usá el mecanismo que ya tenga la integración; si no, polling ~30-60s). Mostrá timestamp de última actualización.
- Sin partido en vivo: el panel muestra el próximo partido (cuenta regresiva) + último resultado, con la misma línea de probabilidad de la IA. Nunca queda vacío.
- Si el resultado en vivo afecta el cuadro del usuario, resaltalo ("este resultado mueve tu predicción").

## Reglas

- No inventar datos. Confirmá los campos contra la respuesta real de la API y documentá cuáles usaste. Faltante = [N/D].
- También: que cada cruce muestre la probabilidad de la IA por equipo (P% por selección) y se actualice tras cada resultado real.
- Marca y tono plano ya definidos (sin jerga de telar en la UI). i18n ES/EN/FR, idioma guardado por usuario, también en el panel nuevo.
- Cambios quirúrgicos. No rehagas el motor.

## Entregable

1. Reporte corto de la revisión (qué encontraste, qué arreglaste).
2. Qué campos devuelve la API FIFA y cuáles mapeaste al panel.
3. Panel "EN VIVO" funcionando, con fallback a próximo/último partido y [N/D] para campos ausentes.
4. Probabilidad por cruce visible y actualizándose.
