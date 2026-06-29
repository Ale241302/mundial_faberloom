"""
Motor del torneo — Elo + Monte Carlo + puntaje.
Híbrido: el modelo proyecta todo el cuadro; el admin registra partidos reales
por etapa (BracketFixture) y carga resultados (Result) que determinan
ganadores, puntos, estado (vivo/eliminado) y el rival probable siguiente.
"""
import math
import random

BASE = [1, 2, 3, 5, 8]
EXACT_BONUS = [1, 2, 3, 4, 5]
ROUND_LABELS = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"]


class Engine:
    def __init__(self, teams, fixtures, results, overrides=None):
        self.teams = teams
        self.round0 = [{"a": f["a"], "b": f["b"], "id": f["id"]} for f in fixtures]
        self.results = results or {}
        self.overrides = overrides or {}

    def elo(self, t):
        info = self.teams.get(t)
        return (info["elo"] + (55 if info.get("host") else 0)) if info else 1700

    def p_win(self, a, b):
        return 1.0 / (1.0 + math.pow(10, -(self.elo(a) - self.elo(b)) / 400.0))

    def _lock(self, r, i):
        return (self.results.get(r, {}).get(i) or {}).get("winner")

    def _apply_override(self, r, cur):
        ov = self.overrides.get(r, {})
        for i, m in enumerate(cur):
            o = ov.get(i)
            if o:
                if o.get("a"):
                    m["a"] = o["a"]
                if o.get("b"):
                    m["b"] = o["b"]

    def resolve(self, mode="fav"):
        rounds = [[dict(m) for m in self.round0]]
        cur = rounds[0]
        res = []
        for r in range(5):
            self._apply_override(r, cur)
            winners = []
            for i, m in enumerate(cur):
                x = None
                lk = self._lock(r, i)
                if lk:
                    x = lk
                elif m.get("a") and m.get("b"):
                    if mode == "sample":
                        x = m["a"] if random.random() < self.p_win(m["a"], m["b"]) else m["b"]
                    else:
                        x = m["a"] if self.p_win(m["a"], m["b"]) >= 0.5 else m["b"]
                winners.append(x)
            if r < 4:
                nxt = []
                for k in range(0, len(winners), 2):
                    nxt.append({"a": winners[k], "b": winners[k + 1] if k + 1 < len(winners) else None})
                rounds.append(nxt)
                cur = nxt
            res.append(winners)
        return {"rounds": rounds, "res": res}

    def simulate(self, n=4000):
        reach = {t: [0, 0, 0, 0, 0] for t in self.teams}
        for _ in range(n):
            res = self.resolve("sample")["res"]
            for r in range(5):
                for w in res[r]:
                    if w:
                        reach[w][r] += 1
        return {t: [x / n for x in reach[t]] for t in reach}

    def freeze(self, mode="fav"):
        rounds = self.resolve(mode)["rounds"]
        ai_picks, prob_f = {}, {}
        for r, ms in enumerate(rounds):
            ai_picks[r], prob_f[r] = {}, {}
            for i, m in enumerate(ms):
                a, b = m.get("a"), m.get("b")
                if a and b:
                    pa = self.p_win(a, b)
                    ai_picks[r][i] = a if pa >= 0.5 else b
                    prob_f[r][i] = {a: pa, b: 1 - pa}
        return ai_picks, prob_f

    # ---- estado y rival probable ----
    def status_of(self, team):
        if self._lock(4, 0) == team:
            return "champ"
        rounds = self.resolve("fav")["rounds"]
        for r in range(5):
            for i, m in enumerate(rounds[r]):
                if team in (m.get("a"), m.get("b")):
                    lk = self._lock(r, i)
                    if lk and lk != team:
                        return "out"
        return "alive"

    def next_match(self, team):
        """Próximo partido del equipo: rival probable (modelo si está pendiente)."""
        if self.status_of(team) == "out":
            return None
        rounds = self.resolve("fav")["rounds"]
        for r in range(5):
            for i, m in enumerate(rounds[r]):
                a, b = m.get("a"), m.get("b")
                if team in (a, b) and not self._lock(r, i):
                    opp = b if a == team else a
                    if not opp:
                        return None
                    pending = False
                    if r >= 1:
                        feeders = [2 * i, 2 * i + 1]
                        team_feeder = next((f for f in feeders if self._lock(r - 1, f) == team), None)
                        opp_feeders = [f for f in feeders if f != team_feeder]
                        opp_feeder = opp_feeders[0] if opp_feeders else None
                        pending = (opp_feeder is None) or (not self._lock(r - 1, opp_feeder))
                    return {
                        "round": r, "index": i, "opponent": opp,
                        "my_prob": round(self.p_win(team, opp) * 100),
                        "pending": pending,
                        "round_label": ROUND_LABELS[r],
                    }
        return None

    @staticmethod
    def surprise(p):
        return min(3.0, 0.5 / p) if (p and p < 0.5) else 1.0

    def score_user(self, user_preds):
        # Por partido: ganador +3 ; cada equipo con goles acertados +2 (independiente).
        # Máx 7 (gana + ambos marcadores). 0 si no acierta nada. Sin escalar por ronda.
        pts = 0
        for r in range(5):
            res_r = self.results.get(r, {})
            ups = user_preds.get(r, {})
            for i, real in res_r.items():
                up = ups.get(i)
                if not up:
                    continue
                target = real.get("winner") or real.get("live_leader")
                if up.get("pick") and target and up["pick"] == target:
                    pts += 3                       # ganador (o líder provisional en vivo)
                rs = real.get("score") or ""
                if rs and "-" in rs and up.get("goal_a") is not None and up.get("goal_b") is not None:
                    try:
                        ra, rb = [int(x) for x in rs.split("-")[:2]]
                        if int(up["goal_a"]) == ra:
                            pts += 2               # goles del equipo local
                        if int(up["goal_b"]) == rb:
                            pts += 2               # goles del equipo visitante
                    except (ValueError, TypeError):
                        pass
        return round(pts)

    def score_ai(self):
        ai_picks, _ = self.freeze("fav")
        pts = 0
        for r in range(5):
            for i, real in self.results.get(r, {}).items():
                target = real.get("winner") or real.get("live_leader")
                if target and ai_picks.get(r, {}).get(i) == target:
                    pts += 3
        return pts


def build_engine():
    from .models import Team, Fixture, Result, BracketFixture

    teams = {t.name: {"elo": t.elo, "host": t.host} for t in Team.objects.all()}
    fixtures = [
        {"a": f.team_a.name, "b": f.team_b.name, "id": str(f.match_no)}
        for f in Fixture.objects.select_related("team_a", "team_b").all()
    ]
    results = {}
    for res in Result.objects.all():
        results.setdefault(res.round, {})[res.index] = {"winner": res.winner, "score": res.score}
    overrides = {}
    for bf in BracketFixture.objects.all():
        overrides.setdefault(bf.round, {})[bf.index] = {"a": bf.team_a, "b": bf.team_b, "date": bf.date_label}
    return Engine(teams, fixtures, results, overrides)
