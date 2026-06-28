import { useEffect, useState } from "react";
import { Modal, Flag } from "./ui.jsx";
import { L, ROUND_LABELS } from "../lib/i18n.js";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";

export default function TeamDossier({ name, onClose }) {
  const { lang, boot, engine } = useApp();
  const l = L(lang);
  const [data, setData] = useState(null);
  const [proj, setProj] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    API.team(name, lang).then(setData).catch(() => {});
  }, [name, lang]);

  const team = boot.teams[name];
  if (!team) return null;
  const st = team.stats || {};
  const reach = data?.reach;

  // cruce de R32 + mercado
  const fx = boot.fixtures.find((f) => f.team_a === name || f.team_b === name);
  const side = fx ? (fx.team_a === name ? "a" : "b") : null;
  const mk = fx ? boot.market[String(fx.match_no)] : null;
  const mAdv = mk ? (side === "a" ? mk.a_adv : mk.b_adv) : null;
  const oct = reach ? Math.round(reach[0] * 100) : null;
  const opp = fx ? (side === "a" ? fx.team_b : fx.team_a) : null;

  const status = computeStatus(name, engine, l);
  const milestones = [l.rounds[1], l.rounds[2], l.rounds[3], l.rounds[4], l.champ];

  const askAI = async () => {
    setLoadingAI(true);
    try { const d = await API.team(name, lang, true); setProj(d.projection || st.proy); }
    finally { setLoadingAI(false); }
  };

  const KV = ({ k, v }) => (
    <div><span>{k}</span><b>{v != null && v !== "" ? v : "[N/D]"}</b></div>
  );

  return (
    <Modal onClose={onClose}>
      <div className="dh">
        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
          <span className="fl"><Flag team={name} big /></span>
          <div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19 }}>{name}</div>
            <div className="note" style={{ fontStyle: "normal" }}>
              Elo {team.elo}{team.host ? " (+55)" : ""} · {st.posg || `${l.group} —`}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={"badge " + status.cls}>{status.txt}</span>
          <div className="x" onClick={onClose} style={{ marginTop: 8 }}>✕</div>
        </div>
      </div>

      <div className="sec">
        <h3>{l.reach}</h3>
        <div className="reach">
          {milestones.map((mn, k) => {
            const p = reach ? reach[k] : null;
            return (
              <div className="r" key={k}>
                <span>{mn}</span>
                <span className="pbar"><i style={{ width: (p ? Math.round(p * 100) : 0) + "%" }} /></span>
                <span style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
                  {p != null ? (p * 100).toFixed(p < 0.1 ? 1 : 0) + "%" : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {mk && (
        <div className="sec">
          <h3>{l.mktmodel} · vs {opp}</h3>
          <div className="kv">
            <div><span>{l.mktadv}</span><b>{mAdv}%</b></div>
            <div><span>{l.modadv}</span><b>{oct != null ? oct + "%" : "—"}</b></div>
          </div>
          {oct != null && (
            <div className="note">Δ <b style={{ color: oct - mAdv > 0 ? "var(--teal)" : "var(--red)" }}>
              {oct - mAdv > 0 ? "+" : ""}{oct - mAdv}</b></div>
          )}
        </div>
      )}

      <div className="sec">
        <h3>{l.statsh}</h3>
        <div className="kv">
          <KV k={l.st.gf} v={st.gf} /><KV k={l.st.gc} v={st.gc} />
          <KV k={l.st.xg} v={st.xg} /><KV k={l.st.xga} v={st.xga} />
          <KV k={l.st.poss} v={st.poss != null ? st.poss + "%" : null} />
          <KV k={l.st.sh} v={(st.sh ?? "—") + (st.sot != null ? " / " + st.sot : "")} />
          <KV k={l.st.kp} v={st.kp} /><KV k={l.st.cs} v={st.cs} />
          <KV k={l.st.pass} v={st.pass != null ? st.pass + "%" : null} />
        </div>
      </div>

      {st.res && (
        <div className="sec"><h3>{l.resv}</h3>
          {st.res.map((r, k) => <span className="pill" key={k}>{r}</span>)}
        </div>
      )}

      {st.inj && st.inj.length > 0 && (
        <div className="sec"><h3>{l.inj}</h3>
          {st.inj.map((x, k) => (
            <div className="inj" key={k}>
              <span><b>{x.p}</b> · {x.t}</span>
              <span className={"sev s-" + x.s}>{x.s}</span>
            </div>
          ))}
          <div className="note">{l.injnote}</div>
        </div>
      )}

      <div className="sec">
        <h3>{l.proj}</h3>
        <div style={{ fontSize: 13 }}>{(proj || st.proy || "").replace(/\*\*/g, "") || "—"}</div>
        <button className="ghost sm" style={{ marginTop: 8 }} onClick={askAI} disabled={loadingAI}>
          {loadingAI ? "Kimi…" : "↻ Proyección Kimi"}
        </button>
      </div>
    </Modal>
  );
}

function computeStatus(t, engine, l) {
  const { rounds } = engine.resolve("fav");
  if (engine.lock(4, 0) === t) return { cls: "b-champ", txt: l.champst };
  for (let r = 0; r < 5; r++) {
    const ms = rounds[r];
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]; if (!m.a || !m.b) continue;
      if (m.a === t || m.b === t) {
        const lk = engine.lock(r, i);
        if (lk && lk !== t) return { cls: "b-out", txt: l.out + " · " + l.rounds[r] };
      }
    }
  }
  return { cls: "b-alive", txt: l.alive };
}
