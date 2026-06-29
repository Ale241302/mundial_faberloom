import { useMemo } from "react";
import { Flag } from "./ui.jsx";
import { L, tn } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

export default function MasterTable({ query, onOpenTeam }) {
  const { lang, boot, engine } = useApp();
  const l = L(lang);

  const rows = useMemo(() => {
    const out = [];
    boot.fixtures.forEach((f) => {
      const mk = boot.market[String(f.match_no)];
      [["a", f.team_a], ["b", f.team_b]].forEach(([s, t]) => {
        const st = boot.teams[t]?.stats || {};
        const reach = boot.reach?.[t];
        out.push({
          t, grp: st.posg || "—", xg: st.xg, gf: st.gf, gc: st.gc,
          adv: s === "a" ? mk?.a_adv : mk?.b_adv,
          oct: reach ? Math.round(reach[0] * 100) : null,
        });
      });
    });
    const q = (query || "").toLowerCase();
    return out
      .filter((r) => r.t.toLowerCase().includes(q))
      .sort((a, b) => (b.oct ?? b.adv ?? 0) - (a.oct ?? a.adv ?? 0));
  }, [boot, query]);

  const status = (t) => {
    const { rounds } = engine.resolve("fav");
    if (engine.lock(4, 0) === t) return { cls: "b-champ", txt: l.champst };
    for (let r = 0; r < 5; r++) {
      const ms = rounds[r];
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i]; if (!m.a || !m.b) continue;
        if (m.a === t || m.b === t) {
          const lk = engine.lock(r, i);
          if (lk && lk !== t) return { cls: "b-out", txt: l.out };
        }
      }
    }
    return { cls: "b-alive", txt: l.alive };
  };

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>{l.group}</th><th>{l.group}</th><th>xG</th><th>GF/GC</th>
          <th>{l.mktadv}</th><th>{l.modadv}</th><th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, k) => {
          const s = status(r.t);
          return (
            <tr key={k} onClick={() => onOpenTeam(r.t)}>
              <td><Flag team={r.t} /> {tn(r.t, lang)}</td>
              <td>{r.grp}</td>
              <td>{r.xg ?? "—"}</td>
              <td>{(r.gf ?? "—")}/{(r.gc ?? "—")}</td>
              <td>{r.adv != null ? r.adv + "%" : "—"}</td>
              <td>{r.oct != null ? r.oct + "%" : "—"}</td>
              <td><span className={"badge " + s.cls}>{s.txt}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
