import { motion } from "framer-motion";
import { flagSrc } from "../lib/flags.js";

const ISO = [
  "M14 7 V19", "M14 29 V41", "M24 7 V9", "M24 19 V29", "M24 39 V41",
  "M34 7 V19", "M34 29 V41", "M7 14 H9", "M19 14 H29", "M39 14 H41",
  "M7 24 H19", "M29 24 H41", "M7 34 H9", "M19 34 H29", "M39 34 H41",
];

export function Iso({ size = 26, color = "var(--coral)", className = "iso" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="FaberLoom">
      <g stroke={color} strokeWidth="3.5" strokeLinecap="round">
        {ISO.map((d, i) => <path key={i} d={d} />)}
      </g>
    </svg>
  );
}

export function Flag({ team, big }) {
  const src = flagSrc(team, big);
  if (!src) return null;
  const h = big ? 32 : 15, w = Math.round((h * 4) / 3);
  return <img className="flag" src={src} alt="" style={{ width: w, height: h }} loading="lazy" />;
}

export function Eye() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="1.7" fill="currentColor" />
    </svg>
  );
}

// Overlay + card con animación spring
export function Modal({ children, onClose, wide }) {
  return (
    <motion.div
      className="ov"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <motion.div
        className={"card" + (wide ? " flcard-wide" : "")}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
