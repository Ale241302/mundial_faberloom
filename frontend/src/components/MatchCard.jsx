import { useState } from "react";
import { motion } from "framer-motion";
import { Flag } from "./ui.jsx";
import { L, LX, ROUND_LABELS } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

export default function MatchCard({ r, i, m, compact, column }) {
  const { lang, engine, boot, mode, predictions, isAdmin, mc } = useApp();
  const l = L(lang);
  const lx = LX(lang);
  m = m || {};
  const known = m.a && m.b;
  const pa = known ? engine.pWin(m.a, m.b) : 0.5;
  const lk = engine.lock(r, i);
  const sc = engine.score(r, i);
  const up = predictions[r]?.[i]?.pick;
  const g = predictions[r]?.[i] || {};
  const ap = boot.ai_picks?.[r]?.[i] || boot.ai_picks?.[String(r)]?.[String(i)];
  const open = r === boot.state.round_open;
  const canPredict = mode === "pick" && known;
  const realCompact = compact && r <= 2 && known;
  const roundOpenResult = open && mode === "result" && known && isAdmin;

  const clsFor = (team) =>
    lk ? (lk === team ? "win" : "lose") : (mode === "pick" && up === team ? "pick" : "");

  const predScore =
    g.goal_a != null && g.goal_a !== "" && g.goal_b != null && g.goal_b !== ""
      ? `${g.goal_a}–${g.goal_b}` : "";
  const tie = predScore && Number(g.goal_a) === Number(g.goal_b);

  // fecha · sede (16vos del fixture; octavos+ del partido registrado por admin)
  const dateLabel = r === 0
    ? (boot.fixtures.find((f) => String(f.match_no) === String(m.id))?.date_label || "")
    : (engine.dateOf(r, i) || "");

  // En columnas (desktop) NO se repite la etiqueta de etapa: la columna ya la
  // muestra. Solo 16vos enseña fecha. En móvil (stack) sí se muestra etiqueta.
  const label = column
    ? (r === 0 ? dateLabel : dateLabel)
    : (r === 0 ? (dateLabel || ROUND_LABELS[lang][0]) : ROUND_LABELS[lang][r]);

  const CSide = ({ team }) => {
    if (!team) return <div className="cmps" style={{ opacity: 0.4 }}>·</div>;
    const pc = Math.round(engine.pWin(team, team === m.a ? m.b : m.a) * 100) + "%";
    return (
      <div className={"cmps " + clsFor(team)} onClick={() => mc.pick(r, i, team, m)}>
        <Flag team={team} />
        <span className="tnm" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team}</span>
        {ap === team && open && <span className="tagai">{l.ai}</span>}
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
          {ap === team && open && <span className="tagai">{l.ai}</span>}
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
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={"mtch" + (column ? " cmp" : "") + (realCompact ? " cmpd" : "") + (open && !lk ? " live" : "")}
    >
      {(label || predScore || sc) && (
        <div className="rnd">
          <span>{label}</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {predScore && <span style={{ color: "var(--coral)" }}>{predScore}</span>}
            {sc && <span>{sc}</span>}
          </span>
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

      {roundOpenResult && <AdminScore r={r} i={i} m={m} sc={sc} />}
    </motion.div>
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
