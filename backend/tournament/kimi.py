"""
IA del sistema = Kimi (Moonshot). API compatible con OpenAI.

predict(a, b, ...) -> dict con el pronóstico del cruce:
  { winner, score, prob, analysis, source }
Kimi ESTIMA (xG, marcador) a partir de lo que la FIFA sí entrega (marcador real,
posesión) + la forma acumulada de cada selección. Todo se etiqueta como
"estimación del modelo". Si no hay API key o falla, cae a un modelo Elo local.
"""
import json
import re
import requests
from django.conf import settings


def _enabled():
    return bool(settings.KIMI_ENABLED and settings.KIMI_API_KEY)


def _chat(messages, max_tokens=400, temperature=0.5):
    url = f"{settings.KIMI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {settings.KIMI_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": settings.KIMI_MODEL, "messages": messages,
               "max_tokens": max_tokens, "temperature": temperature}
    r = requests.post(url, json=payload, headers=headers, timeout=35)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()


SYSTEM = (
    "Eres el motor analítico de FaberLoom para el Mundial 2026. Tono considerado, "
    "cálido, auditable; sin hype. Estimas a partir de datos reales de FIFA (marcador, "
    "posesión) y de la forma reciente de cada selección. Devuelves SIEMPRE JSON válido."
)


def _stat_brief(name, stats):
    s = stats or {}
    res = ", ".join(s.get("res", [])[:4]) if s.get("res") else "sin partidos recientes"
    return (f"{name}: GF {s.get('gf','?')}, GC {s.get('gc','?')}, xG {s.get('xg','?')}, "
            f"posesión {s.get('poss','?')}%, forma reciente [{res}]")


def predict(team_a, team_b, p_elo_a, stats_a=None, stats_b=None, lang="es"):
    """Pronóstico del cruce. Kimi si hay key; si no, Elo local."""
    if not _enabled():
        return _local(team_a, team_b, p_elo_a)
    try:
        user = (
            f"Idioma de salida: {lang}.\n"
            f"Cruce: {team_a} vs {team_b}.\n"
            f"Probabilidad Elo de base (gana {team_a}): {round(p_elo_a*100)}%.\n"
            f"{_stat_brief(team_a, stats_a)}\n{_stat_brief(team_b, stats_b)}\n\n"
            "Ajusta tu estimación a la forma reciente. Devuelve SOLO este JSON:\n"
            '{"winner":"<equipo ganador>","score":"<marcador ej 2-1>",'
            '"prob":<probabilidad 0-100 de que gane winner>,'
            '"analysis":"<2-3 frases, marca claramente ESTIMACION-MODELO>"}'
        )
        raw = _chat([{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": user}])
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {}
        winner = data.get("winner") or (team_a if p_elo_a >= 0.5 else team_b)
        return {
            "winner": winner,
            "score": str(data.get("score") or "").strip(),
            "prob": int(data.get("prob") or round(max(p_elo_a, 1 - p_elo_a) * 100)),
            "analysis": (data.get("analysis") or "").strip(),
            "source": "kimi",
        }
    except Exception:
        return _local(team_a, team_b, p_elo_a)


def _local(a, b, pa):
    fav, dog = (a, b) if pa >= 0.5 else (b, a)
    favpct = round(max(pa, 1 - pa) * 100)
    txt = (f"{fav} es favorito ({favpct}% [ESTIMACION-MODELO Elo]) frente a {dog}. "
           "Sin API de IA disponible; estimación por ranking Elo. No es predicción, es señal.")
    return {"winner": fav, "score": "", "prob": favpct, "analysis": txt, "source": "elo"}


# compatibilidad con el nombre anterior usado en views
def projection(team_a, team_b, prob_a, stats_a=None, stats_b=None, lang="es"):
    d = predict(team_a, team_b, prob_a, stats_a, stats_b, lang)
    parts = []
    if d.get("winner"):
        parts.append(f"Ganador estimado: {d['winner']}")
    if d.get("score"):
        parts.append(f"marcador {d['score']}")
    if d.get("prob"):
        parts.append(f"{d['prob']}%")
    head = " · ".join(parts)
    return (head + ". " + d.get("analysis", "")).strip()


def commentary(me, ai, lang="es"):
    return None
