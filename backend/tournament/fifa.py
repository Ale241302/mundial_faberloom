"""
Sincronización de resultados reales desde la API pública de FIFA (api.fifa.com).
Competición 17 (Mundial), temporada 285023. Mapea código FIFA -> equipo, y
stage -> ronda, y vuelca marcadores/estado en Result.

Lo ejecuta una tarea Celery (cada par de minutos) o el comando `sync_fifa`.
"""
from datetime import datetime, timezone

import requests
from django.core.cache import cache

FIFA_BASE = "https://api.fifa.com/api/v3"
ID_COMPETITION = "17"
ID_SEASON = "285023"

# IdStage de FIFA -> ronda interna (0..4). 289291 = 3er puesto (se ignora).
STAGE_ROUND = {
    "289287": 0,  # Dieciseisavos (R32)
    "289288": 1,  # Octavos
    "289289": 2,  # Cuartos
    "289290": 3,  # Semifinal
    "289292": 4,  # Final
}

# Código país FIFA -> nombre del equipo en nuestra BD
FIFA_CODE = {
    "GER": "Alemania", "PAR": "Paraguay", "FRA": "Francia", "SWE": "Suecia",
    "RSA": "Sudáfrica", "CAN": "Canadá", "NED": "P. Bajos", "MAR": "Marruecos",
    "POR": "Portugal", "CRO": "Croacia", "ESP": "España", "AUT": "Austria",
    "USA": "EE.UU.", "BIH": "Bosnia", "BEL": "Bélgica", "SEN": "Senegal",
    "BRA": "Brasil", "JPN": "Japón", "CIV": "C. Marfil", "NOR": "Noruega",
    "MEX": "México", "ECU": "Ecuador", "ENG": "Inglaterra", "COD": "RD Congo",
    "ARG": "Argentina", "CPV": "Cabo Verde", "AUS": "Australia", "EGY": "Egipto",
    "SUI": "Suiza", "ALG": "Argelia", "COL": "Colombia", "GHA": "Ghana",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (MundialFaberLoom sync)"}
LIVE_CACHE_KEY = "fifa_live_panel_v1"
LIVE_STALE_CACHE_KEY = "fifa_live_panel_stale_v1"
LIVE_REFRESH_SECONDS = 60
LIVE_CACHE_TTL = 45


def _fetch_matches(count=100):
    url = f"{FIFA_BASE}/calendar/matches"
    params = {"idCompetition": ID_COMPETITION, "idSeason": ID_SEASON,
              "count": count, "language": "es"}
    r = requests.get(url, params=params, headers=HEADERS, timeout=25)
    r.raise_for_status()
    return r.json().get("Results", [])


def _team_name(side):
    code = (side or {}).get("IdCountry") or (side or {}).get("Abbreviation")
    return FIFA_CODE.get(code)


def _local_desc(value):
    """Extrae Description de campos localizados de FIFA sin asumir idioma."""
    if isinstance(value, list) and value:
        return value[0].get("Description") or ""
    if isinstance(value, dict):
        return value.get("Description") or ""
    return value or ""


def _display_team_name(side):
    return _team_name(side) or _local_desc((side or {}).get("TeamName")) or (side or {}).get("Abbreviation") or ""


def _classify(item, played):
    # FIFA observado en /calendar/matches: MatchStatus 0 = finalizado,
    # MatchStatus 1 = no empezado. Otros codigos (o marcador sin final) se
    # tratan como en vivo. Nunca inferimos estadisticas inexistentes.
    status = item.get("MatchStatus")
    if str(status) == "0":
        return "finished"
    if str(status) == "1" and not played:
        return "scheduled"
    if not played:
        return "scheduled"
    return "live"


def _find_key(obj, names):
    """Busca una clave exacta case-insensitive en dict/list anidados."""
    wanted = {str(n).lower() for n in names}
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).lower() in wanted:
                return v
        for v in obj.values():
            found = _find_key(v, names)
            if found is not None:
                return found
    elif isinstance(obj, list):
        for v in obj:
            found = _find_key(v, names)
            if found is not None:
                return found
    return None


def _num(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        s = str(value).replace("%", "").strip()
        return float(s) if "." in s else int(s)
    except (TypeError, ValueError):
        return None


def _stat_pair(value):
    """Normaliza un posible par home/away; si no existe, devuelve N/D logico."""
    empty = {"home": None, "away": None}
    if value is None:
        return empty
    if isinstance(value, str) and "-" in value:
        a, b = value.split("-", 1)
        return {"home": _num(a), "away": _num(b)}
    if isinstance(value, dict):
        home = None
        away = None
        for key in ("Home", "HomeTeam", "HomeValue", "HomeTeamValue", "home", "homeTeam"):
            if key in value:
                home = value[key]
                break
        for key in ("Away", "AwayTeam", "AwayValue", "AwayTeamValue", "away", "awayTeam"):
            if key in value:
                away = value[key]
                break
        if isinstance(home, dict):
            home = home.get("Value") or home.get("value") or home.get("Score")
        if isinstance(away, dict):
            away = away.get("Value") or away.get("value") or away.get("Score")
        return {"home": _num(home), "away": _num(away)}
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        return {"home": _num(value[0]), "away": _num(value[1])}
    return empty


def _stat_from(item, *names):
    return _stat_pair(_find_key(item, names))


def _stats(item):
    # En la respuesta auditada el unico campo de estad?stica de partido presente
    # es BallPossession, y actualmente viene null. El resto se expone como null
    # para que el front pinte [N/D] en vez de inventar datos.
    return {
        "possession": _stat_pair(item.get("BallPossession")),
        "shots": _stat_from(item, "Shots", "TotalShots", "TotalAttempts", "AttemptsOnGoal"),
        "shots_on_target": _stat_from(item, "ShotsOnTarget", "OnTarget", "AttemptsOnTarget"),
        "corners": _stat_from(item, "Corners", "CornerKicks"),
        "fouls": _stat_from(item, "Fouls", "FoulsCommitted"),
        "yellow_cards": _stat_from(item, "YellowCards", "YellowCard"),
        "red_cards": _stat_from(item, "RedCards", "RedCard"),
        "xg": _stat_from(item, "ExpectedGoals", "xG"),
    }


def _score(side, item, top_key):
    value = item.get(top_key)
    if value is not None:
        return value
    return (side or {}).get("Score")


def _round_index_for(home, away, round_no, eng):
    if eng is None or round_no is None or not home or not away:
        return None, None
    try:
        rounds = eng.resolve("fav")["rounds"]
    except Exception:
        return None, None
    if round_no >= len(rounds):
        return None, None
    target = {home, away}
    for idx, m in enumerate(rounds[round_no]):
        if m.get("a") and m.get("b") and {m["a"], m["b"]} == target:
            return round_no, idx
    return None, None


def _probabilities(home, away, eng):
    if eng is None or not home or not away or home not in eng.teams or away not in eng.teams:
        return None
    pa = eng.p_win(home, away)
    fav = home if pa >= 0.5 else away
    fav_p = pa if pa >= 0.5 else (1 - pa)
    return {
        home: pa,
        away: 1 - pa,
        "favorite": fav,
        "favorite_prob": round(fav_p * 100),
    }


def _normalize_match(item, eng=None):
    home_side, away_side = item.get("Home") or {}, item.get("Away") or {}
    home = _display_team_name(home_side)
    away = _display_team_name(away_side)
    hs = _score(home_side, item, "HomeTeamScore")
    as_ = _score(away_side, item, "AwayTeamScore")
    played = hs is not None and as_ is not None
    status = _classify(item, played)
    round_no = STAGE_ROUND.get(str(item.get("IdStage")))
    r, idx = _round_index_for(home, away, round_no, eng)
    score = f"{hs}-{as_}" if played else ""
    current_leader = ""
    if played:
        if hs > as_:
            current_leader = home
        elif as_ > hs:
            current_leader = away
    winner = ""
    if status == "finished" and played:
        if current_leader:
            winner = current_leader
        else:
            hp = item.get("HomeTeamPenaltyScore")
            ap = item.get("AwayTeamPenaltyScore")
            if hp is not None and ap is not None:
                winner = home if hp >= ap else away

    return {
        "id": str(item.get("IdMatch") or ""),
        "match_number": item.get("MatchNumber"),
        "round": r,
        "index": idx,
        "stage_id": str(item.get("IdStage") or ""),
        "stage": _local_desc(item.get("StageName")),
        "status": status,
        "minute": item.get("MatchTime") or "",
        "date": item.get("Date") or "",
        "local_date": item.get("LocalDate") or "",
        "stadium": _local_desc((item.get("Stadium") or {}).get("Name")),
        "city": _local_desc((item.get("Stadium") or {}).get("CityName")),
        "home": {
            "name": home,
            "code": home_side.get("Abbreviation") or home_side.get("IdCountry") or "",
            "score": hs,
            "penalty_score": item.get("HomeTeamPenaltyScore"),
        },
        "away": {
            "name": away,
            "code": away_side.get("Abbreviation") or away_side.get("IdCountry") or "",
            "score": as_,
            "penalty_score": item.get("AwayTeamPenaltyScore"),
        },
        "score": score,
        "winner": winner,
        "current_leader": current_leader,
        "stats": _stats(item),
        "probabilities": _probabilities(home, away, eng),
        "raw_fields": sorted(item.keys()),
    }


def _compact_match(m):
    pr = m.get("probabilities") or {}
    return {
        "home": (m.get("home") or {}).get("name"),
        "away": (m.get("away") or {}).get("name"),
        "score": m.get("score") or "",
        "status": m.get("status"),
        "minute": m.get("minute") or "",
        "date": m.get("date") or m.get("local_date") or "",
        "round": m.get("round"),
        "index": m.get("index"),
        "fav": pr.get("favorite"),
        "fav_prob": pr.get("favorite_prob"),
        "stats": m.get("stats") or {},
    }


def _build_live_panel(items):
    from .engine import build_engine

    try:
        eng = build_engine()
    except Exception:
        eng = None
    matches = [_normalize_match(it, eng) for it in items]
    matches = [m for m in matches if m["home"]["name"] or m["away"]["name"]]

    live = sorted([m for m in matches if m["status"] == "live"], key=lambda x: x.get("date") or "")
    scheduled = sorted([m for m in matches if m["status"] == "scheduled"], key=lambda x: x.get("date") or "")
    finished = sorted([m for m in matches if m["status"] == "finished"], key=lambda x: x.get("date") or "", reverse=True)

    api_fields = sorted({k for it in items for k in it.keys()})
    return {
        "mode": "live" if live else "fallback",
        "in_play": live[0] if live else None,
        "next_match": scheduled[0] if scheduled else None,
        "last_result": finished[0] if finished else None,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "refresh_seconds": LIVE_REFRESH_SECONDS,
        "api_fields": api_fields,
        "queue": [_compact_match(m) for m in (live + scheduled)][:10],
    }


def _panel_from_db():
    """Fallback: arma el panel desde la BD (último resultado) si FIFA cae."""
    from .engine import build_engine
    from .models import Result
    empty = {k: {"home": None, "away": None} for k in
             ("possession", "shots", "shots_on_target", "corners", "fouls", "yellow_cards", "red_cards", "xg")}
    last = None
    try:
        rounds = build_engine().resolve("fav")["rounds"]
        res = Result.objects.filter(status="finished").order_by("-round", "-index").first()
        if res and res.round < len(rounds) and res.index < len(rounds[res.round]):
            s = rounds[res.round][res.index]
            last = {"status": "finished", "round": res.round, "index": res.index,
                    "home": {"name": s.get("a"), "score": None}, "away": {"name": s.get("b"), "score": None},
                    "score": res.score, "winner": res.winner, "current_leader": res.winner,
                    "minute": "", "stats": dict(empty), "probabilities": None}
    except Exception:
        pass
    return {"mode": "fallback", "in_play": None, "next_match": None, "last_result": last,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "refresh_seconds": LIVE_REFRESH_SECONDS, "api_fields": [], "queue": [], "source_ok": False}


def _augment_with_kimi(panel):
    """Rellena stats faltantes (FIFA = null) con ESTIMACIONES marcadas. El partido
    destacado usa Kimi (1 llamada); los de la lista usan heurística (sin LLM)."""
    from .kimi import estimate_match_stats, _local_stats

    def _name(side):
        return side.get("name") if isinstance(side, dict) else side

    def _fill(match, use_kimi):
        if not match:
            return
        stats = match.get("stats") or {}
        home, away = _name(match.get("home")), _name(match.get("away"))
        if not home or not away:
            return
        # 1) DATOS REALES de API-Football (solo partidos en vivo / finalizados)
        if match.get("status") in ("live", "finished"):
            try:
                from . import apifootball
                real = apifootball.live_stats(home, away)
            except Exception:
                real = {}
            for k, pair in (real or {}).items():
                if pair and (pair[0] is not None or pair[1] is not None):
                    stats[k] = {"home": pair[0], "away": pair[1], "estimated": False}
                    match["stats_real"] = True
        # 2) lo que siga faltando -> ESTIMACIÓN (Kimi para el destacado, heurística el resto)
        missing = [k for k, v in stats.items()
                   if not v or (v.get("home") is None and v.get("away") is None)]
        if not missing:
            match["stats"] = stats
            return
        score = match.get("score") or ""
        est = (estimate_match_stats(home, away, score, match.get("status") or "")
               if use_kimi else _local_stats(home, away, score))
        if est:
            for k in missing:
                pair = est.get(k)
                if pair and len(pair) == 2:
                    stats[k] = {"home": pair[0], "away": pair[1], "estimated": True}
            match["stats_estimated"] = True
        match["stats"] = stats

    _fill(panel.get("in_play") or panel.get("next_match") or panel.get("last_result"), True)
    for q in (panel.get("queue") or []):
        _fill(q, False)


def get_live_panel(force=False):
    """Panel en vivo cacheado (TTL corto). Si FIFA cae: cache stale o BD local.
    Rellena stats faltantes con estimación de Kimi."""
    if not force:
        cached = cache.get(LIVE_CACHE_KEY)
        if cached:
            return cached
    try:
        panel = _build_live_panel(_fetch_matches())
        panel["source_ok"] = True
    except Exception:
        stale = cache.get(LIVE_STALE_CACHE_KEY)
        if stale:
            stale = dict(stale)
            stale["mode"] = "stale"
            cache.set(LIVE_CACHE_KEY, stale, LIVE_CACHE_TTL)
            return stale
        panel = _panel_from_db()
    try:
        _augment_with_kimi(panel)
    except Exception:
        pass
    cache.set(LIVE_CACHE_KEY, panel, LIVE_CACHE_TTL)
    cache.set(LIVE_STALE_CACHE_KEY, panel, 60 * 30)
    return panel

def sync_results():
    """Devuelve (creados/actualizados, lista de logs). Idempotente."""
    from .engine import build_engine
    from .models import Result

    items = _fetch_matches()
    # agrupar por ronda
    by_round = {0: [], 1: [], 2: [], 3: [], 4: []}
    for it in items:
        r = STAGE_ROUND.get(str(it.get("IdStage")))
        if r is None:
            continue
        home = _team_name(it.get("Home"))
        away = _team_name(it.get("Away"))
        if not home or not away:
            continue
        hs = it.get("HomeTeamScore")
        as_ = it.get("AwayTeamScore")
        played = hs is not None and as_ is not None
        status = _classify(it, played)
        # ganador (solo si finalizado)
        winner = ""
        if status == "finished" and played:
            if hs > as_:
                winner = home
            elif as_ > hs:
                winner = away
            else:
                hp = it.get("HomeTeamPenaltyScore"); ap = it.get("AwayTeamPenaltyScore")
                if hp is not None and ap is not None:
                    winner = home if hp >= ap else away
        score = f"{hs}-{as_}" if played else ""
        by_round[r].append({
            "teams": {home, away}, "winner": winner, "score": score,
            "status": status, "minute": it.get("MatchTime") or "",
        })

    n, logs = 0, []
    # procesar en orden de ronda, reconstruyendo el cuadro entre rondas
    for r in range(5):
        eng = build_engine()
        rounds = eng.resolve("fav")["rounds"]
        slots = rounds[r] if r < len(rounds) else []
        for fm in by_round[r]:
            if fm["status"] == "scheduled":
                continue
            for i, m in enumerate(slots):
                if m.get("a") and m.get("b") and {m["a"], m["b"]} == fm["teams"]:
                    Result.objects.update_or_create(
                        round=r, index=i,
                        defaults={"winner": fm["winner"], "score": fm["score"],
                                  "status": fm["status"], "minute": fm["minute"]},
                    )
                    n += 1
                    logs.append(f"R{r}[{i}] {'/'.join(fm['teams'])} -> {fm['status']} {fm['score']} {fm['winner']}")
                    break
    apply_standings()
    recompute_form()
    notify_finished()
    return n, logs


def recompute_form():
    """Reconstruye la forma REAL de cada selección desde los Result finalizados.
    Idempotente: recalcula desde cero. Guarda en Team.stats: res (resultados
    verificados para mostrar y alimentar a Kimi) y ko_gf/ko_gc (goles acumulados
    en eliminatorias). No inventa nada: solo marcadores reales de la FIFA.
    """
    from .engine import build_engine
    from .models import Team, Result

    eng = build_engine()
    rounds = eng.resolve("fav")["rounds"]
    form, gfa = {}, {}
    for res in Result.objects.filter(status="finished").order_by("round", "index"):
        if res.round >= len(rounds):
            continue
        slots = rounds[res.round]
        if res.index >= len(slots):
            continue
        slot = slots[res.index]
        a, b = slot.get("a"), slot.get("b")
        if not a or not b:
            continue
        ga = gb = None
        if res.score and "-" in res.score:
            try:
                ga, gb = [int(x) for x in res.score.split("-")[:2]]
            except (ValueError, TypeError):
                ga = gb = None
        for team, opp, gf_, gc_ in ((a, b, ga, gb), (b, a, gb, ga)):
            if gf_ is not None and gc_ is not None:
                tag = "V" if gf_ > gc_ else ("D" if gf_ < gc_ else ("V" if res.winner == team else "D"))
                form.setdefault(team, []).append(f"{tag} {gf_}-{gc_} vs {opp}")
                g = gfa.setdefault(team, [0, 0]); g[0] += gf_; g[1] += gc_
            else:
                tag = "V" if res.winner == team else "D"
                form.setdefault(team, []).append(f"{tag} vs {opp}")

    for t in Team.objects.all():
        if t.name not in form:
            continue
        stats = dict(t.stats or {})
        stats["res"] = form[t.name][-5:]
        if t.name in gfa:
            stats["ko_gf"], stats["ko_gc"] = gfa[t.name]
        t.stats = stats
        t.save(update_fields=["stats"])


# Clasificación final de la fase de grupos (real FIFA). code -> (posición, grupo).
# La fase de grupos está cerrada: estos valores son definitivos.
STANDINGS = {
    "MEX": (1, "A"), "RSA": (2, "A"),
    "SUI": (1, "B"), "CAN": (2, "B"), "BIH": (3, "B"),
    "BRA": (1, "C"), "MAR": (2, "C"),
    "USA": (1, "D"), "AUS": (2, "D"), "PAR": (3, "D"),
    "GER": (1, "E"), "CIV": (2, "E"), "ECU": (3, "E"),
    "NED": (1, "F"), "JPN": (2, "F"), "SWE": (3, "F"),
    "BEL": (1, "G"), "EGY": (2, "G"),
    "ESP": (1, "H"), "CPV": (2, "H"),
    "FRA": (1, "I"), "NOR": (2, "I"), "SEN": (3, "I"),
    "ARG": (1, "J"), "AUT": (2, "J"), "ALG": (3, "J"),
    "COL": (1, "K"), "POR": (2, "K"), "COD": (3, "K"),
    "ENG": (1, "L"), "CRO": (2, "L"), "GHA": (3, "L"),
}


def apply_standings():
    """Escribe posición+grupo (posg) de cada selección desde la clasificación
    real de FIFA, para que el 'Grupo' aparezca en TODAS y no como '—'.
    Idempotente."""
    from .models import Team
    n = 0
    for code, (pos, grp) in STANDINGS.items():
        name = FIFA_CODE.get(code)
        if not name:
            continue
        t = Team.objects.filter(name=name).first()
        if not t:
            continue
        stats = dict(t.stats or {})
        stats["posg"] = f"{pos}° Grupo {grp}"
        t.stats = stats
        t.save(update_fields=["stats"])
        n += 1
    return n


def notify_finished():
    """Envía un correo por cada partido recién FINALIZADO a los usuarios que lo
    pronosticaron: resultado real (goles + ganador) vs su pronóstico. Idempotente
    gracias a Result.notified (no reenvía)."""
    from .engine import build_engine, ROUND_LABELS
    from .models import Result, Prediction
    from emails.service import send_match_result_email

    pendientes = Result.objects.filter(status="finished", notified=False)
    if not pendientes:
        return 0
    eng = build_engine()
    rounds = eng.resolve("fav")["rounds"]
    enviados = 0
    for res in pendientes:
        if res.round >= len(rounds):
            continue
        slots = rounds[res.round]
        if res.index >= len(slots):
            continue
        a, b = slots[res.index].get("a"), slots[res.index].get("b")
        if not a or not b:
            continue
        # orientar el marcador al orden a-b usando el ganador real
        ga = gb = None
        if res.score and "-" in res.score:
            try:
                n1, n2 = sorted([int(x) for x in res.score.split("-")[:2]], reverse=True)
            except (ValueError, TypeError):
                n1 = n2 = None
            if n1 is not None:
                if res.winner == a:
                    ga, gb = n1, n2
                elif res.winner == b:
                    ga, gb = n2, n1
                else:                       # empate (definido por penales)
                    ga = gb = n1
        real_score = f"{ga}-{gb}" if ga is not None else (res.score or "")

        for pr in Prediction.objects.filter(round=res.round, index=res.index).select_related("user"):
            user = pr.user
            if not getattr(user, "email", ""):
                continue
            pred_score = ""
            if pr.goal_a is not None and pr.goal_b is not None:
                pred_score = f"{pr.goal_a}-{pr.goal_b}"
            winner_hit = bool(pr.pick) and pr.pick == res.winner
            exact_hit = bool(pred_score) and ga is not None and pr.goal_a == ga and pr.goal_b == gb
            ctx = {
                "round_label": ROUND_LABELS[res.round],
                "team_a": a, "team_b": b,
                "real_score": real_score, "real_winner": res.winner,
                "pick": pr.pick, "pred_score": pred_score,
                "winner_hit": winner_hit, "exact_hit": exact_hit,
            }
            try:
                send_match_result_email(user, ctx)
                enviados += 1
            except Exception:
                pass
        res.notified = True
        res.save(update_fields=["notified"])
    return enviados
