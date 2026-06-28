import { useRef, useState, useLayoutEffect } from "react";
import MatchCard from "./MatchCard.jsx";
import { ROUND_LABELS, LX } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

const COLDEF = [
  [0, [0, 1, 2, 3, 4, 5, 6, 7], 0],
  [1, [0, 1, 2, 3], 0],
  [2, [0, 1], 0],
  [3, [0], 0],
  [4, [0], 1],
  [3, [1], 0],
  [2, [2, 3], 0],
  [1, [4, 5, 6, 7], 0],
  [0, [8, 9, 10, 11, 12, 13, 14, 15], 0],
];

const EYE_OFF = (
  <svg width="12" height="12" viewBox="0 0 16 16"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="1.7" fill="currentColor" /><line x1="2.4" y1="2.4" x2="13.6" y2="13.6" stroke="currentColor" strokeWidth="1.3" /></svg>
);
const EYE_ON = (
  <svg width="12" height="12" viewBox="0 0 16 16"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="1.7" fill="currentColor" /></svg>
);

export default function Bracket() {
  const { lang, engine } = useApp();
  const lx = LX(lang);
  const rounds = engine.resolve("fav").rounds;
  const labels = ROUND_LABELS[lang];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [viewRound, setViewRound] = useState(0);
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState({});
  const brkRef = useRef(null);

  useLayoutEffect(() => {
    if (isMobile) return;
    const draw = () => {
      const brk = brkRef.current;
      if (!brk) return;
      let svg = brk.querySelector("svg.brk-lines");
      if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "brk-lines");
        brk.insertBefore(svg, brk.firstChild);
      }
      svg.setAttribute("width", brk.scrollWidth);
      svg.setAttribute("height", brk.scrollHeight);
      const brc = brk.getBoundingClientRect(), sl = brk.scrollLeft, stp = brk.scrollTop;
      const counts = [16, 8, 4, 2];
      let d = "";
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < counts[r]; i++) {
          const child = document.getElementById(`mt_${r}_${i}`);
          const parent = document.getElementById(`mt_${r + 1}_${Math.floor(i / 2)}`);
          if (!child || !parent) continue;
          const a = child.getBoundingClientRect(), b = parent.getBoundingClientRect();
          const ay = a.top - brc.top + stp + a.height / 2;
          const by = b.top - brc.top + stp + b.height / 2;
          const leftChild = a.left < b.left;
          const ax = (leftChild ? a.right : a.left) - brc.left + sl;
          const bx = (leftChild ? b.left : b.right) - brc.left + sl;
          const mx = (ax + bx) / 2;
          d += `M${ax} ${ay}H${mx}V${by}H${bx}`;
        }
      }
      svg.innerHTML = `<path d="${d}" fill="none" stroke="rgba(138,130,120,.55)" stroke-width="1.3" stroke-linejoin="round"/>`;
    };
    const t1 = requestAnimationFrame(draw);
    const t2 = setTimeout(draw, 280);
    window.addEventListener("resize", draw);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); window.removeEventListener("resize", draw); };
  });

  const toggleHide = (r) => setHidden((h) => ({ ...h, [r]: !h[r] }));

  if (isMobile) {
    const ms = rounds[viewRound] || [];
    const half = ms.length / 2;
    return (
      <div>
        <div className="rtabs">
          {labels.map((lab, r) => (
            <button key={r} className={viewRound === r ? "on" : ""} onClick={() => setViewRound(r)}>{lab}</button>
          ))}
        </div>
        {viewRound === 4 ? (
          <>
            <div className="sidehd" style={{ color: "var(--ocre)" }}>★ {labels[4]}</div>
            <div className="mstack"><MatchCard r={4} i={0} m={ms[0] || {}} /></div>
          </>
        ) : (
          <>
            <div className="sidehd">◀ {labels[viewRound]}</div>
            <div className="mstack">
              {ms.slice(0, half).map((m, i) => <MatchCard key={i} r={viewRound} i={i} m={m} />)}
            </div>
            <div className="sidehd">{labels[viewRound]} ▶</div>
            <div className="mstack">
              {ms.slice(half).map((m, k) => <MatchCard key={k + half} r={viewRound} i={k + half} m={m} />)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className={"ghost sm toolbtn" + (compact ? " on" : "")} onClick={() => setCompact((c) => !c)}>
          {compact ? lx.expand : lx.compact}
        </button>
      </div>
      <div className="brk" ref={brkRef}>
        {COLDEF.map((d, ci) => {
          const colR = d[0], idxs = d[1], isFin = d[2];
          if (hidden[colR]) {
            return (
              <div className="col-hidden" key={ci} onClick={() => toggleHide(colR)} title={lx.show}>
                <span className="eye">{EYE_ON}</span>
                <span className="vlabel">{isFin ? "★ " : ""}{labels[colR]}</span>
              </div>
            );
          }
          return (
            <div className={"col" + (isFin ? " fin" : "")} key={ci}>
              <div className="col-h">
                {isFin ? "★ " : ""}{labels[colR]}
                <button className="cmtoggle" title={lx.hide} onClick={() => toggleHide(colR)}>{EYE_OFF}</button>
              </div>
              <div className="col-body">
                {idxs.map((i) => (
                  <MatchCard key={i} r={colR} i={i} m={(rounds[colR] || [])[i] || {}} column compact={compact} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
