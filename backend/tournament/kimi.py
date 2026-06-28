"""
IA del sistema = Kimi (Moonshot). API compatible con OpenAI.

Se usa para:
  - projection(a, b): proyección textual de un cruce (estilo dossier).
  - commentary(me, ai): narrativa del "rival IA" vs el usuario.

Si no hay KIMI_API_KEY o la llamada falla, se cae a un texto local
derivado del motor Elo (nunca rompe la app).
"""
import requests
from django.conf import settings


def _enabled():
    return bool(settings.KIMI_ENABLED and settings.KIMI_API_KEY)


def _chat(messages, max_tokens=320, temperature=0.6):
    url = f"{settings.KIMI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.KIMI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.KIMI_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    r = requests.post(url, json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"].strip()


SYSTEM = (
    "Eres el motor analítico de FaberLoom para el Mundial 2026. "
    "Tono: considerado, cálido, auditable. Sin hype ni 'magia'. "
    "Respondes en el idioma que se te indique, breve y concreto."
)


def projection(team_a, team_b, prob_a, stats_a=None, stats_b=None, lang="es"):
    """Devuelve un texto de proyección del cruce. Usa Kimi si está disponible."""
    if not _enabled():
        return _local_projection(team_a, team_b, prob_a, lang)
    try:
        pct = round(prob_a * 100)
        user = (
            f"Idioma: {lang}. Proyecta el cruce {team_a} vs {team_b}. "
            f"Probabilidad modelo (Elo) de que gane {team_a}: {pct}%. "
            f"Stats {team_a}: {stats_a}. Stats {team_b}: {stats_b}. "
            "Da 2-3 frases: marcador probable, una clave táctica y una nota de incertidumbre. "
            "Marca explícitamente que es ESTIMACION-MODELO, no predicción."
        )
        return _chat([{"role": "system", "content": SYSTEM},
                      {"role": "user", "content": user}])
    except Exception:
        return _local_projection(team_a, team_b, prob_a, lang)


def commentary(me, ai, lang="es"):
    if not _enabled():
        return None
    try:
        user = (
            f"Idioma: {lang}. El jugador lleva {me} puntos y la IA {ai}. "
            "En UNA frase corta, motívalo a seguir o a buscar una sorpresa. Sin emojis."
        )
        return _chat([{"role": "system", "content": SYSTEM},
                      {"role": "user", "content": user}], max_tokens=60, temperature=0.7)
    except Exception:
        return None


def _local_projection(a, b, prob_a, lang):
    pct = round(prob_a * 100)
    fav, dog = (a, b) if prob_a >= 0.5 else (b, a)
    favpct = max(pct, 100 - pct)
    if lang == "en":
        return (f"{fav} is favored ({favpct}% model estimate) over {dog}. "
                "Close margins suggest a 1–2 goal edge. ESTIMACION-MODELO, not a prediction.")
    if lang == "fr":
        return (f"{fav} est favori ({favpct}% estimation modèle) face à {dog}. "
                "Écart serré : avantage probable d'1 à 2 buts. ESTIMACION-MODELO, pas une prédiction.")
    return (f"{fav} es favorito ({favpct}% [ESTIMACION-MODELO]) frente a {dog}. "
            "El margen sugiere ventaja de 1-2 goles. No es predicción, es señal del modelo.")
