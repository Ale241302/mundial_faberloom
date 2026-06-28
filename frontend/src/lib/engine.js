// Motor cliente — resuelve el cuadro desde los datos de la API (mismo
// algoritmo que el backend). No hay datos quemados: todo viene de bootstrap.
export const BASE_PTS = [1, 2, 3, 5, 8];

export function makeEngine(boot) {
  const teams = boot.teams;       // {name: {elo, host, ...}}
  const fixtures = boot.fixtures; // [{match_no, team_a, team_b, date_label}]
  const results = boot.results || {}; // {round: {index: {winner, score}}}

  const round0 = [...fixtures]
    .sort((a, b) => a.match_no - b.match_no)
    .map((f) => ({ a: f.team_a, b: f.team_b, id: String(f.match_no) }));

  const elo = (t) => {
    const x = teams[t];
    return x ? x.elo + (x.host ? 55 : 0) : 1700;
  };
  const pWin = (a, b) => 1 / (1 + Math.pow(10, -(elo(a) - elo(b)) / 400));
  const lock = (r, i) => results[r]?.[i]?.winner || results[String(r)]?.[String(i)]?.winner;
  const score = (r, i) => results[r]?.[i]?.score || results[String(r)]?.[String(i)]?.score || "";

  function resolve(mode = "fav") {
    let rounds = [round0.map((m) => ({ ...m }))];
    let cur = rounds[0];
    const res = [];
    for (let r = 0; r < 5; r++) {
      const winners = [];
      cur.forEach((m, i) => {
        let x = null;
        const lk = lock(r, i);
        if (lk) x = lk;
        else if (m.a && m.b)
          x = mode === "sample"
            ? (Math.random() < pWin(m.a, m.b) ? m.a : m.b)
            : (pWin(m.a, m.b) >= 0.5 ? m.a : m.b);
        winners.push(x);
      });
      if (r < 4) {
        const n = [];
        for (let k = 0; k < winners.length; k += 2) n.push({ a: winners[k], b: winners[k + 1] });
        rounds.push(n);
        cur = n;
      }
      res.push(winners);
    }
    return { rounds, res };
  }

  const surprise = (p) => (p && p < 0.5 ? Math.min(3, 0.5 / p) : 1);

  function scoreUser(userPicks) {
    const probF = boot.prob_f || {};
    let pts = 0;
    for (let r = 0; r < 5; r++) {
      const locks = results[r] || results[String(r)] || {};
      const ups = userPicks[r] || {};
      Object.keys(locks).forEach((i) => {
        const real = locks[i].winner;
        const up = ups[i];
        if (up && up === real) {
          const p = (probF[r]?.[i] || probF[String(r)]?.[String(i)] || {})[up] || 0.5;
          pts += BASE_PTS[r] * surprise(p);
        }
      });
    }
    return Math.round(pts);
  }

  return { teams, round0, elo, pWin, lock, score, resolve, scoreUser, surprise };
}
