"""Cliente de API-Football (api-sports.io) para estadísticas REALES en vivo.

Datos como los que muestra Google: remates, posesión, pases, tarjetas, córners,
fueras de juego, xG. Se activa solo si hay APIFOOTBALL_KEY en el entorno; si no,
devuelve {} y el panel cae a las estimaciones de Kimi (marcadas con ≈).

Todo es "mejor esfuerzo": cualquier fallo de red/parseo devuelve {} y el panel
sigue funcionando con las estimaciones.
"""
from datetime import datetime, timezone

import requests
from django.conf import settings
from django.core.cache import cache

_BASE = "https://{host}/{path}"
_TIMEOUT = 6

# nombre en español (como lo usa la FIFA/nuestro sistema) -> alias en inglés
# que usa API-Football. Se compara normalizado (minúsculas, sin acentos).
_EN = {
    "alemania": "germany", "paraguay": "paraguay", "francia": "france",
    "suecia": "sweden", "sudáfrica": "south africa", "canadá": "canada",
    "p. bajos": "netherlands", "países bajos": "netherlands", "marruecos": "morocco",
    "portugal": "portugal", "croacia": "croatia", "españa": "spain",
    "austria": "austria", "ee.uu.": "usa", "estados unidos": "usa",
    "bosnia": "bosnia and herzegovina", "bélgica": "belgium", "senegal": "senegal",
    "brasil": "brazil", "japón": "japan", "c. marfil": "ivory coast",
    "costa de marfil": "ivory coast", "noruega": "norway", "méxico": "mexico",
    "ecuador": "ecuador", "inglaterra": "england", "rd congo": "congo dr",
    "argentina": "argentina", "cabo verde": "cape verde", "australia": "australia",
    "egipto": "egypt", "suiza": "switzerland", "argelia": "algeria",
    "colombia": "colombia", "ghana": "ghana",
}

# tipo de estadística de API-Football -> clave nuestra
_MAP = {
    "ball possession": "possession",
    "total shots": "shots",
    "shots on goal": "shots_on_target",
    "corner kicks": "corners",
    "fouls": "fouls",
    "yellow cards": "yellow_cards",
    "red cards": "red_cards",
    "expected_goals": "xg",
}


def _norm(s):
    s = (s or "").strip().lower()
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
        s = s.replace(a, b)
    return s


def _en(name):
    return _EN.get(_norm(name), _norm(name))


def _enabled():
    return bool(getattr(settings, "APIFOOTBALL_KEY", ""))


def _get(path, params, ttl, cache_key):
    """GET cacheado contra API-Football. Devuelve la lista 'response' o []."""
    hit = cache.get(cache_key)
    if hit is not None:
        return hit
    host = getattr(settings, "APIFOOTBALL_HOST", "v3.football.api-sports.io")
    url = _BASE.format(host=host, path=path)
    headers = {"x-apisports-key": settings.APIFOOTBALL_KEY}
    r = requests.get(url, params=params, headers=headers, timeout=_TIMEOUT)
    data = r.json() if r.status_code == 200 else {}
    resp = data.get("response") or []
    cache.set(cache_key, resp, ttl)
    return resp


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _fixtures_today():
    league = getattr(settings, "APIFOOTBALL_LEAGUE", 1)
    season = getattr(settings, "APIFOOTBALL_SEASON", 2026)
    day = _today()
    return _get("fixtures",
                {"league": league, "season": season, "date": day},
                ttl=300, cache_key=f"apif:fix:{league}:{season}:{day}")


def _find_fixture_id(home, away):
    he, ae = _en(home), _en(away)
    for fx in _fixtures_today():
        t = (fx.get("teams") or {})
        fh = _norm((t.get("home") or {}).get("name"))
        fa = _norm((t.get("away") or {}).get("name"))
        pair = {fh, fa}
        if {he, ae} & pair and (he in pair or ae in pair) and len(pair & {he, ae}) >= 1:
            # ambos equipos deben coincidir (en cualquier orden)
            if (he in pair) and (ae in pair):
                return (fx.get("fixture") or {}).get("id"), fh
    return None, None


def _to_num(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val
    s = str(val).strip().replace("%", "")
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return None


def live_stats(home, away):
    """Devuelve {clave: (valor_home, valor_away)} con datos REALES, o {} si no hay
    key, no se encuentra el partido o la API no responde."""
    if not _enabled():
        return {}
    fid, fix_home_norm = _find_fixture_id(home, away)
    if not fid:
        return {}
    resp = _get("fixtures/statistics", {"fixture": fid},
                ttl=45, cache_key=f"apif:stats:{fid}")
    if not resp or len(resp) < 2:
        return {}
    # cada entrada: {team:{name}, statistics:[{type,value},...]}
    # ordenar a (home, away) según el nombre local del fixture
    a, b = resp[0], resp[1]
    if _norm((a.get("team") or {}).get("name")) != fix_home_norm and \
       _norm((b.get("team") or {}).get("name")) == fix_home_norm:
        a, b = b, a
    da = {(_norm(s.get("type"))): s.get("value") for s in (a.get("statistics") or [])}
    db = {(_norm(s.get("type"))): s.get("value") for s in (b.get("statistics") or [])}
    out = {}
    for api_type, key in _MAP.items():
        if api_type in da or api_type in db:
            hv, av = _to_num(da.get(api_type)), _to_num(db.get(api_type))
            if hv is not None or av is not None:
                out[key] = (hv, av)
    return out
