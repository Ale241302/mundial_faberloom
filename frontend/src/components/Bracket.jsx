import { useEffect, useRef, useState, useLayoutEffect } from "react";
import MatchCard from "./MatchCard.jsx";
import { ROUND_LABELS } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

// columnas: [labelRoundIndex, roundIndex, [indices], esFinal]
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

export default function Bracket({ onOpenTeam }) {
  const { lang, engine } = useApp();
  const rounds = engine.resolve("fav").rounds;
  const labels = ROUND_LABELS[lang];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const [viewRound, setViewRound] = useState(0);
  const brkRef = useRef(null);

  // conectores SVG (igual que el original)
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
      const W = brk.scrollWidth, H = brk.scrollHeight;
      svg.setAttribute("width", W); svg.setAttribute("height", H);
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
    const t2 = setTimeout(draw, 260);
    window.addEventListener("resize", draw);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); window.removeEventListener("resize", draw); };
  });

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
            <div className="mstack"><MatchCard r={4} i={0} m={ms[0] || {}} onOpenTeam={onOpenTeam} /></div>
          </>
        ) : (
          <>
            <div className="sidehd">◀ {labels[viewRound]}</div>
            <div className="mstack">
              {ms.slice(0, half).map((m, i) => <MatchCard key={i} r={viewRound} i={i} m={m} onOpenTeam={onOpenTeam} />)}
            </div>
            <div className="sidehd">{labels[viewRound]} ▶</div>
            <div className="mstack">
              {ms.slice(half).map((m, k) => <MatchCard key={k + half} r={viewRound} i={k + half} m={m} onOpenTeam={onOpenTeam} />)}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="brk" ref={brkRef}>
      {COLDEF.map((d, ci) => {
        const [colR, idxs, isFin] = d;
        return (
          <div className={"col" + (isFin ? " fin" : "")} key={ci}>
            <div className="col-h">{isFin ? "★ " : ""}{labels[colR]}</div>
            <div className="col-body">
              {idxs.map((i) => (
                <MatchCard key={i} r={colR} i={i} m={(rounds[colR] || [])[i] || {}} compact onOpenTeam={onOpenTeam} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
