import { useEffect, useState } from "react";
import { Modal, Flag } from "./ui.jsx";
import { L } from "../lib/i18n.js";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";

const ST_BADGE = { alive: "b-alive", out: "b-out", champ: "b-champ" };

export default function TeamDossier({ name, onClose }) {
  const { lang, boot } = useApp();
  const l = L(lang);
  const [data, setData] = useState(null);
  const [proj, setProj] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => { API.team(name, lang).then(setData).catch(() => {}); }, [name, lang]);

  const team = boot.teams[name];
  if (!team) return null;
  const st = team.stats || {};
  const reach = data?.reach;
  const status = data?.status || "alive";
  const nm = data?.next_match;
  const eliminated = status === "out";

  const statusTxt = status === "champ" ? l.champst : status === "out" ? l.out : l.alive;
  const milestones = [l.rounds[1], l.rounds[2], l.rounds[3], l.rounds[4], l.champ];

  const askAI = async () => {
    setLoadingAI(true);
    try { const d = await API.team(name, lang, true); setProj(d.projection || st.proy || null); }
    finally { setLoadingAI(false); }
  };

  // proj puede ser objeto {winner,score,prob,analysis} o texto antiguo
  const pj = proj && typeof proj === "object" ? proj : null;
  const pjText = pj ? (pj.analysis || "") : (typeof proj === "string" ? proj : (st.proy || ""));

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
          <span className={"badge " + (ST_BADGE[status] || "b-alive")}>{statusTxt}</span>
          <div className="x" onClick={onClose} style={{ marginTop: 8 }}>✕</div>
        </div>
      </div>

      {eliminated ? (
        <div className="note" style={{ marginBottom: 4 }}>
          Este equipo ya fue eliminado del torneo. No se proyectan más cruces.
        </div>
      ) : (
        <>
          {nm && (
            <div className="sec">
              <h3>Próximo rival probable · {nm.round_label}</h3>
              <div className="plrow" style={{ borderBottom: 0 }}>
                <span className="plteams">
                  <Flag team={nm.opponent} /> <b>{nm.opponent}</b>
                  {nm.pending && <span className="note" style={{ marginLeft: 6 }}>(proyección del modelo)</span>}
                </span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--coral)" }}>{name} {nm.my_prob}%</span>
              </div>
            </div>
          )}

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

          <div className="sec">
            <h3>{l.proj} · Kimi</h3>
            {pj && (
              <div className="plrow" style={{ borderBottom: 0, marginBottom: 4 }}>
                <span className="plteams">
                  Ganador estimado: <b>{pj.winner}</b>
                  {pj.score ? <span className="note" style={{ marginLeft: 6 }}>marcador {pj.score}</span> : null}
                </span>
                {pj.prob != null && (
                  <span style={{ fontFamily: "var(--mono)", color: "var(--coral)" }}>{pj.prob}%</span>
                )}
              </div>
            )}
            <div style={{ fontSize: 13 }}>{(pjText || "").replace(/\*\*/g, "") || "Pulsa para generar el pronóstico de la IA."}</div>
            <div className="note" style={{ marginTop: 6 }}>Estimación del modelo (Kimi), no es predicción. Se ajusta con cada partido jugado.</div>
            <button className="ghost sm" style={{ marginTop: 8 }} onClick={askAI} disabled={loadingAI}>
              {loadingAI ? "Kimi analizando…" : "↻ Analizar con Kimi"}
            </button>
          </div>
        </>
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
    </Modal>
  );
}
