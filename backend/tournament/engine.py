"""
Motor del torneo — Elo + Monte Carlo + puntaje.
Híbrido: el modelo proyecta todo el cuadro; el admin registra partidos reales
por etapa (BracketFixture) que sustituyen el emparejamiento proyectado, y
carga resultados (Result) que determinan ganadores y puntos.
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

    @staticmethod
    def surprise(p):
        return min(3.0, 0.5 / p) if (p and p < 0.5) else 1.0

    def score_user(self, user_preds):
        _, prob_f = self.freeze("fav")
        pts = 0.0
        for r in range(5):
            res_r = self.results.get(r, {})
            ups = user_preds.get(r, {})
            for i, real in res_r.items():
                up = ups.get(i)
                if not up:
                    continue
                if up.get("pick") and up["pick"] == real.get("winner"):
                    p = (prob_f.get(r, {}).get(i, {}) or {}).get(up["pick"], 0.5)
                    pts += BASE[r] * self.surprise(p)
                rs = real.get("score") or ""
                if rs and "-" in rs and up.get("goal_a") is not None and up.get("goal_b") is not None:
                    try:
                        ra, rb = [int(x) for x in rs.split("-")[:2]]
                        if int(up["goal_a"]) == ra and int(up["goal_b"]) == rb:
                            pts += EXACT_BONUS[r]
                    except (ValueError, TypeError):
                        pass
        return round(pts)

    def score_ai(self):
        ai_picks, _ = self.freeze("fav")
        pts = 0
        for r in range(5):
            for i, real in self.results.get(r, {}).items():
                if ai_picks.get(r, {}).get(i) == real.get("winner"):
                    pts += BASE[r]
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
