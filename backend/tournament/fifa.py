"""
Sincronización de resultados reales desde la API pública de FIFA (api.fifa.com).
Competición 17 (Mundial), temporada 285023. Mapea código FIFA -> equipo, y
stage -> ronda, y vuelca marcadores/estado en Result.

Lo ejecuta una tarea Celery (cada par de minutos) o el comando `sync_fifa`.
"""
import requests
from django.conf import settings

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


def _fetch_matches():
    url = f"{FIFA_BASE}/calendar/matches"
    params = {"idCompetition": ID_COMPETITION, "idSeason": ID_SEASON,
              "count": 100, "language": "es"}
    r = requests.get(url, params=params, headers=HEADERS, timeout=25)
    r.raise_for_status()
    return r.json().get("Results", [])


def _team_name(side):
    code = (side or {}).get("IdCountry") or (side or {}).get("Abbreviation")
    return FIFA_CODE.get(code)


def _classify(item, played):
    # FIFA: MatchStatus 0 = FINALIZADO; 1 = no empezado. En vivo => hay marcador
    # pero todavía sin ganador definido.
    if not played:
        return "scheduled"
    if item.get("Winner") or item.get("MatchStatus") == 0:
        return "finished"
    return "live"


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
    recompute_form()
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
