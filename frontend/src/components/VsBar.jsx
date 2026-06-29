import { motion } from "framer-motion";
import { L } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

export default function VsBar() {
  const { lang, boot, engine, predictions, user } = useApp();
  const l = L(lang);
  if (!user) return null;

  const me = (boot.my_points != null) ? boot.my_points : engine.scoreUser(predictions);
  const ai = boot.ai_points || 0;
  const d = Math.abs(me - ai);
  const msg = me > ai ? l.vswin.replace("{d}", d) : me < ai ? l.vslose.replace("{d}", d) : l.vstie;

  return (
    <motion.div className="vsbar"
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <div style={{ fontSize: 10, fontFamily: "var(--mono)", opacity: 0.7 }}>{l.vslabel}</div>
        <div>
          <span className="sc me">{me}</span>{" "}
          <span style={{ opacity: 0.5 }}>—</span>{" "}
          <span className="sc ai">{ai}</span>
        </div>
      </div>
      <div className="msg">{msg}</div>
    </motion.div>
  );
}
