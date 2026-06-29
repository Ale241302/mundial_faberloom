import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Flag } from "./ui.jsx";
import { L, LX, ROUND_LABELS } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

export default function MatchCard({ r, i, m, compact, column }) {
  const { lang, engine, boot, mode, predictions, isAdmin, mc } = useApp();
  const l = L(lang);
  const lx = LX(lang);
  const [pop, setPop] = useState(null);
  m = m || {};
  const known = m.a && m.b;
  const pa = known ? engine.pWin(m.a, m.b) : 0.5;
  const lk = engine.lock(r, i);
  const res = engine.resultOf(r, i);
  const isPlayed = engine.played(r, i);          // en juego o finalizado
  const up = predictions[r]?.[i]?.pick;
  const g = predictions[r]?.[i] || {};
  const ap = boot.ai_picks?.[r]?.[i] || boot.ai_picks?.[String(r)]?.[String(i)];
  const open = r === boot.state.round_open;
  const canPredict = mode === "pick" && known && !lk && !isPlayed;
  const realCompact = compact && r <= 2 && known;
  const roundOpenResult = open && mode === "result" && known && isAdmin;

  const clsFor = (team) =>
    lk ? (lk === team ? "win" : "lose") : (mode === "pick" && up === team ? "pick" : "");

  const predScore =
    g.goal_a != null && g.goal_a !== "" && g.goal_b != null && g.goal_b !== ""
      ? `${g.goal_a}–${g.goal_b}` : "";
  const tie = predScore && Number(g.goal_a) === Number(g.goal_b);

  // En columnas (desktop) la card es idéntica a octavos: sin línea de etapa/fecha.
  const label = column ? "" : (r === 0 ? ROUND_LABELS[lang][0] : ROUND_LABELS[lang][r]);

  const showPop = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    setPop({ x: b.left + b.width / 2, top: b.top, bottom: b.bottom });
  };

  const CSide = ({ team }) => {
    if (!team) return <div className="cmps" style={{ opacity: 0.4 }}>·</div>;
    const pc = Math.round(engine.pWin(team, team === m.a ? m.b : m.a) * 100) + "%";
    return (
      <div className={"cmps " + clsFor(team)} onClick={() => mc.pick(r, i, team, m)}>
        <Flag team={team} />
        <span className="tnm" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team}</span>
        {ap === team && open && !isPlayed && <span className="tagai">{l.ai}</span>}
        <span className="pc">{pc}</span>
      </div>
    );
  };

  const Side = ({ team }) => {
    if (!team) return <div className="side" style={{ opacity: 0.4 }}>{l.tbd}</div>;
    return (
      <div className={"side " + clsFor(team)} onClick={() => mc.pick(r, i, team, m)}>
        <span className="nm">
          <Flag team={team} />
          <span className="tnm">{team}</span>
          {ap === team && open && !isPlayed && <span className="tagai">{l.ai}</span>}
        </span>
      </div>
    );
  };

  const GoalIn = ({ side, team }) =>
    canPredict ? (
      <input
        type="number" min="0" step="1" inputMode="numeric"
        value={g["goal_" + side] != null ? g["goal_" + side] : ""}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => mc.goal(r, i, side, e.target.value, m)}
        aria-label={lx.pred + " " + team}
      />
    ) : null;

  return (
    <motion.div
      id={`mt_${r}_${i}`}
      layout
      whileHover={isPlayed ? {} : { y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={"mtch" + (column ? " cmp" : "") + (realCompact ? " cmpd" : "") + (isPlayed ? " played" : "")}
      onMouseEnter={known ? showPop : undefined}
      onMouseMove={known && pop ? showPop : undefined}
      onMouseLeave={() => setPop(null)}
    >
      {known && pop && <MatchPop a={m.a} b={m.b} pa={pa} res={res} engine={engine} pos={pop} />}

      {(label || predScore) && (
        <div className="rnd">
          <span>{label}</span>
          {predScore && <span style={{ color: "var(--coral)" }}>{predScore}</span>}
        </div>
      )}

      {realCompact ? (
        <>
          <CSide team={m.a} />
          {known && (
            <div className="wbar">
              <i className="a" style={{ width: (pa * 100).toFixed(1) + "%" }} />
              <i className="b" style={{ width: ((1 - pa) * 100).toFixed(1) + "%" }} />
            </div>
          )}
          <CSide team={m.b} />
        </>
      ) : (
        <>
          <Side team={m.a} />
          <Side team={m.b} />
          {canPredict && (
            <div className="pred">
              <span className="predl">{lx.pred}</span>
              <div className="predrow">
                <GoalIn side="a" team={m.a} />
                <span className="dash">–</span>
                <GoalIn side="b" team={m.b} />
              </div>
            </div>
          )}
          {canPredict && tie && (
            <div className="pen">
              {lx.whoAdv}
              <button className="sm" onClick={() => mc.pen(r, i, m.a)}><Flag team={m.a} /></button>
              <button className="sm" onClick={() => mc.pen(r, i, m.b)}><Flag team={m.b} /></button>
            </div>
          )}
        </>
      )}

      {res && res.score && (
        <div className={"realres" + (res.status === "live" ? " livenow" : "")}>
          <span className="rl">{res.status === "live" ? ("EN JUEGO" + (res.minute ? " " + res.minute : "")) : "Resultado"}</span>
          <span className="rv">{res.score}</span>
        </div>
      )}

      {roundOpenResult && <AdminScore r={r} i={i} m={m} sc={engine.score(r, i)} />}
    </motion.div>
  );
}

function MatchPop({ a, b, pa, res, engine, pos }) {
  const live = res && res.status === "live";
  const pct = (x) => Math.round(x * 100);
  let ip = null, minute = "";
  if (live && res.score && res.score.includes("-")) {
    const [sa, sb] = res.score.split("-").map((x) => parseInt(x, 10));
    minute = (res.minute || "").toString().replace(/[^0-9+']/g, "");
    const mn = parseInt(minute, 10) || 0;
    if (!isNaN(sa) && !isNaN(sb)) ip = engine.inPlay(pa, sa, sb, mn, "live");
  }
  // colocar arriba de la card; si no cabe (card muy arriba), colocar abajo
  const above = pos.top > 230;
  const style = {
    position: "fixed", left: pos.x, zIndex: 9999, pointerEvents: "none",
    top: above ? pos.top - 8 : pos.bottom + 8,
    transform: above ? "translate(-50%,-100%)" : "translate(-50%,0)",
  };
  return createPortal(
    <div className="predpop" style={style}>
      <div className="pp-h">Pronóstico · pre-partido</div>
      <div className="pp-row"><Flag team={a} /><span className="pp-nm">{a}</span><span className="pp-pc">{pct(pa)}%</span></div>
      <div className="pp-bar"><i className="a" style={{ width: pct(pa) + "%" }} /><i className="b" style={{ width: pct(1 - pa) + "%" }} /></div>
      <div className="pp-row"><Flag team={b} /><span className="pp-nm">{b}</span><span className="pp-pc">{pct(1 - pa)}%</span></div>

      {ip && (
        <>
          <div className="pp-h" style={{ marginTop: 10 }}>
            <span className="pp-livedot" /> En vivo {minute ? minute + "'" : ""} · {res.score}
          </div>
          <div className="pp-bar pp3">
            <i className="a" style={{ width: pct(ip.pA) + "%" }} />
            <i className="d" style={{ width: pct(ip.pD) + "%" }} />
            <i className="b" style={{ width: pct(ip.pB) + "%" }} />
          </div>
          <div className="pp-leg">
            <span>{a} {pct(ip.pA)}%</span>
            <span>X {pct(ip.pD)}%</span>
            <span>{b} {pct(ip.pB)}%</span>
          </div>
          <div className="pp-suc">Éxito (no perder): {a} {pct(ip.pA + ip.pD)}% · {b} {pct(ip.pB + ip.pD)}%</div>
        </>
      )}
    </div>,
    document.body
  );
}

function AdminScore({ r, i, m, sc }) {
  const { mc } = useApp();
  const [a, setA] = useState(sc ? sc.split("-")[0] : "");
  const [b, setB] = useState(sc ? sc.split("-")[1] : "");
  return (
    <div className="scin">
      <input value={a} onChange={(e) => setA(e.target.value)} />
      <span>-</span>
      <input value={b} onChange={(e) => setB(e.target.value)} />
      <button className="sm ghost" onClick={() => mc.adminScore(r, i, m, a, b)}>ok</button>
    </div>
  );
}
