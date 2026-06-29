import { useEffect, useState, useCallback } from "react";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";
import { flagUrl } from "../lib/countries.js";

const TXT = {
  es: { title: "Ranking de jugadores", reload: "Recargar", you: "TÚ", pts: "pts", empty: "Aún no hay jugadores con puntos.", your: "Tu puesto", ai: "IA" },
  en: { title: "Player ranking", reload: "Reload", you: "YOU", pts: "pts", empty: "No players with points yet.", your: "Your rank", ai: "AI" },
  fr: { title: "Classement", reload: "Recharger", you: "TOI", pts: "pts", empty: "Aucun joueur avec des points.", your: "Ton rang", ai: "IA" },
  pt: { title: "Ranking de jogadores", reload: "Recarregar", you: "VOCÊ", pts: "pts", empty: "Ainda sem jogadores com pontos.", your: "Sua posição", ai: "IA" },
};

export default function RankingPanel() {
  const { lang } = useApp();
  const t = TXT[lang] || TXT.es;
  const [rows, setRows] = useState(null);
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    API.ranking()
      .then((d) => { setRows(d.ranking || []); setAi(d.ai_points); })
      .catch(() => setRows([]))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 45000); return () => clearInterval(t); }, [load]);

  const mine = (rows || []).find((r) => r.me);
  const top = (rows || []).slice(0, 50);
  const showMineExtra = mine && !top.some((r) => r.me);

  return (
    <div className="rankp">
      <div className="rankp-h">
        <h3>{t.title}</h3>
        <div className="rankp-meta">
          {ai != null && <span className="rankp-ai">{t.ai} · {ai} {t.pts}</span>}
          {mine && <span className="rankp-you">{t.your}: #{mine.rank}</span>}
          <button className="ghost sm" onClick={load} disabled={busy}>↻ {t.reload}</button>
        </div>
      </div>
      {rows === null ? (
        <div className="note">…</div>
      ) : rows.length === 0 ? (
        <div className="note">{t.empty}</div>
      ) : (
        <div className="rankp-list">
          {top.map((r) => (
            <div key={r.id} className={"rankp-row" + (r.me ? " me" : "")}>
              <span className="rk">{r.rank}</span>
              <span className="nm">{r.country && <img className="rkflag" src={flagUrl(r.country)} alt="" />}{r.name}{r.me && <em className="ywho">{t.you}</em>}</span>
              <span className="pt">{r.points}<small> {t.pts}</small></span>
            </div>
          ))}
          {showMineExtra && (
            <div className="rankp-row me">
              <span className="rk">{mine.rank}</span>
              <span className="nm">{mine.country && <img className="rkflag" src={flagUrl(mine.country)} alt="" />}{mine.name}<em className="ywho">{t.you}</em></span>
              <span className="pt">{mine.points}<small> {t.pts}</small></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
