// Motor cliente — resuelve el cuadro desde la API. Aplica overrides (partidos
// registrados por el admin) y locks (resultados reales). Sin datos quemados.
export const BASE_PTS = [1, 2, 3, 5, 8];
export const EXACT_BONUS = [1, 2, 3, 4, 5];

export function makeEngine(boot) {
  const teams = boot.teams;
  const fixtures = boot.fixtures;
  const results = boot.results || {};
  const overrides = boot.overrides || {};
  const closedM = boot.closed_matches || {};

  const round0 = [...fixtures]
    .sort((a, b) => a.match_no - b.match_no)
    .map((f) => ({ a: f.team_a, b: f.team_b, id: String(f.match_no) }));

  const elo = (t) => { const x = teams[t]; return x ? x.elo + (x.host ? 55 : 0) : 1700; };
  const pWin = (a, b) => 1 / (1 + Math.pow(10, -(elo(a) - elo(b)) / 400));
  const ov = (r, i) => overrides[r]?.[i] || overrides[String(r)]?.[String(i)];
  const resultOf = (r, i) => results[r]?.[i] || results[String(r)]?.[String(i)] || null;
  const lock = (r, i) => (resultOf(r, i) || {}).winner || "";
  const score = (r, i) => (resultOf(r, i) || {}).score || "";
  const statusOf = (r, i) => (resultOf(r, i) || {}).status || "";
  const played = (r, i) => { const s = statusOf(r, i); return s === "live" || s === "finished"; };
  const closed = (r, i) => !!(closedM[r]?.[i] || closedM[String(r)]?.[String(i)]);
  const dateOf = (r, i) => ov(r, i)?.date_label || "";
  const confirmed = (r, i) => !!ov(r, i)?.confirmed || !!lock(r, i);

  function applyOverride(r, cur) {
    cur.forEach((m, i) => { const o = ov(r, i); if (o) { if (o.team_a) m.a = o.team_a; if (o.team_b) m.b = o.team_b; } });
  }

  function resolve(mode = "fav", picks = null) {
    let rounds = [round0.map((m) => ({ ...m }))];
    let cur = rounds[0];
    const res = [];
    for (let r = 0; r < 5; r++) {
      applyOverride(r, cur);
      const winners = [];
      cur.forEach((m, i) => {
        let x = null;
        const lk = lock(r, i);
        if (lk) x = lk;                       // 1) resultado real manda
        else if (m.a && m.b) {
          const up = ((picks && (picks[r] || picks[String(r)])) || {})[i]
                  || ((picks && (picks[r] || picks[String(r)])) || {})[String(i)] || {};
          if (up.pick && (up.pick === m.a || up.pick === m.b)) x = up.pick;   // 2) tu pick
          else x = mode === "sample" ? (Math.random() < pWin(m.a, m.b) ? m.a : m.b) : (pWin(m.a, m.b) >= 0.5 ? m.a : m.b); // 3) modelo
        }
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

  // Modelo in-play: prob. de resultado dado el marcador actual + minuto + fuerza.
  // Goles restantes ~ Poisson, total ~2.7 repartido por fuerza (Elo). Instantáneo.
  function inPlay(pa, sa, sb, minute, status) {
    const fin = status === "finished";
    const left = fin ? 0 : Math.max(0, (90 - (minute || 0))) / 90;
    const share = 0.5 + (pa - 0.5) * 0.7;        // cuota de ataque de A
    const total = 2.7 * left;
    const la = total * share, lb = total * (1 - share);
    const pois = (k, l) => { let f = 1; for (let j = 2; j <= k; j++) f *= j; return Math.exp(-l) * Math.pow(l, k) / f; };
    const cap = 8;
    let pA = 0, pD = 0, pB = 0;
    for (let x = 0; x <= cap; x++) for (let y = 0; y <= cap; y++) {
      const p = pois(x, la) * pois(y, lb);
      const d = (sa + x) - (sb + y);
      if (d > 0) pA += p; else if (d < 0) pB += p; else pD += p;
    }
    const s = pA + pD + pB || 1;
    return { pA: pA / s, pD: pD / s, pB: pB / s };  // gana A / empate / gana B
  }

  function scoreUser(userPicks) {
    const probF = boot.prob_f || {};
    let pts = 0;
    for (let r = 0; r < 5; r++) {
      const locks = results[r] || results[String(r)] || {};
      const ups = userPicks[r] || {};
      Object.keys(locks).forEach((i) => {
        const real = locks[i].winner;
        const up = ups[i];
        if (!up || !real) return;
        if (up.pick && up.pick === real) {
          const p = (probF[r]?.[i] || probF[String(r)]?.[String(i)] || {})[up.pick] || 0.5;
          pts += BASE_PTS[r] * surprise(p);
        }
        const rs = locks[i].score || "";
        if (rs && rs.includes("-") && up.goal_a != null && up.goal_b != null) {
          const [ra, rb] = rs.split("-").map((x) => parseInt(x, 10));
          if (Number(up.goal_a) === ra && Number(up.goal_b) === rb) pts += EXACT_BONUS[r];
        }
      });
    }
    return Math.round(pts);
  }

  return { teams, round0, elo, pWin, lock, score, statusOf, played, closed, resultOf, dateOf, confirmed, resolve, scoreUser, surprise, inPlay };
}
