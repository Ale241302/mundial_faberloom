"""
Motor del torneo — port fiel del simulador (Elo + Monte Carlo + puntaje).
Sin datos quemados: todo sale de la base de datos (Team, Fixture, Result).

Equivalencias con el JS original:
  elo(t)        -> Team.elo (+55 si anfitrión)
  pWin(a,b)     -> logística Elo /400
  resolve(mode) -> arma el cuadro desde R32 aplicando locks (Result)
  simulate(N)   -> Monte Carlo: probabilidad de llegar a cada ronda
  freeze(r)     -> picks de la IA + probabilidades congeladas por ronda
  scoring       -> BASE=[1,2,3,5,8], sorpresa hasta x3
"""
import math
import random

BASE = [1, 2, 3, 5, 8]
ROUND_LABELS = ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"]


class Engine:
    def __init__(self, teams, fixtures, results):
        # teams: {name: {"elo": int, "host": bool}}
        # fixtures: lista ordenada por match_no -> {"a","b","id"}
        # results: {round: {index: winner}}
        self.teams = teams
        self.round0 = [{"a": f["a"], "b": f["b"], "id": f["id"]} for f in fixtures]
        self.locks = results or {}

    # ---- Elo ----
    def elo(self, t):
        info = self.teams.get(t)
        if not info:
            return 1700
        return info["elo"] + (55 if info.get("host") else 0)

    def p_win(self, a, b):
        return 1.0 / (1.0 + math.pow(10, -(self.elo(a) - self.elo(b)) / 400.0))

    # ---- resolución del cuadro ----
    def resolve(self, mode="fav"):
        rounds = [list(self.round0)]
        cur = rounds[0]
        res = []
        for r in range(5):
            winners = []
            for i, m in enumerate(cur):
                x = None
                lk = self.locks.get(r, {}).get(i)
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

    # ---- Monte Carlo: prob. de alcanzar cada ronda ----
    def simulate(self, n=4000):
        reach = {t: [0, 0, 0, 0, 0] for t in self.teams}
        for _ in range(n):
            res = self.resolve("sample")["res"]
            for r in range(5):
                for w in res[r]:
                    if w:
                        reach[w][r] += 1
        return {t: [x / n for x in reach[t]] for t in reach}

    # ---- IA: picks + probabilidades congeladas por ronda ----
    def freeze(self, mode="fav"):
        rounds = self.resolve(mode)["rounds"]
        ai_picks = {}
        prob_f = {}
        for r, ms in enumerate(rounds):
            ai_picks[r] = {}
            prob_f[r] = {}
            for i, m in enumerate(ms):
                a, b = m.get("a"), m.get("b")
                if a and b:
                    pa = self.p_win(a, b)
                    ai_picks[r][i] = a if pa >= 0.5 else b
                    prob_f[r][i] = {a: pa, b: 1 - pa}
        return ai_picks, prob_f

    # ---- puntaje ----
    @staticmethod
    def surprise(p):
        return min(3.0, 0.5 / p) if (p and p < 0.5) else 1.0

    def score_user(self, user_picks):
        """user_picks: {round: {index: pick}}  ->  puntos del usuario."""
        _, prob_f = self.freeze("fav")
        pts = 0.0
        for r in range(5):
            locks = self.locks.get(r, {})
            ups = user_picks.get(r, {})
            for i, real in locks.items():
                up = ups.get(i)
                if up and up == real:
                    p = (prob_f.get(r, {}).get(i, {}) or {}).get(up, 0.5)
                    pts += BASE[r] * self.surprise(p)
        return round(pts)

    def score_ai(self):
        ai_picks, _ = self.freeze("fav")
        pts = 0
        for r in range(5):
            locks = self.locks.get(r, {})
            for i, real in locks.items():
                if ai_picks.get(r, {}).get(i) == real:
                    pts += BASE[r]
        return pts


def build_engine():
    """Carga datos de la BD y devuelve un Engine + estructuras auxiliares."""
    from .models import Team, Fixture, Result

    teams = {t.name: {"elo": t.elo, "host": t.host} for t in Team.objects.all()}
    fixtures = [
        {"a": f.team_a.name, "b": f.team_b.name, "id": str(f.match_no)}
        for f in Fixture.objects.select_related("team_a", "team_b").all()
    ]
    results = {}
    for res in Result.objects.all():
        results.setdefault(res.round, {})[res.index] = res.winner
    return Engine(teams, fixtures, results)
