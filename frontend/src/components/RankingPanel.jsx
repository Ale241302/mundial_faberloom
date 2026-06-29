import { useEffect, useState, useCallback } from "react";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";
import { flagUrl } from "../lib/countries.js";

const TXT = {
  es: { title: "Ranking de jugadores", reload: "Recargar", you: "TÚ", pts: "pts", empty: "Aún no hay jugadores con puntos.", your: "Tu puesto", ai: "IA", today: "Hoy", total: "Total" },
  en: { title: "Player ranking", reload: "Reload", you: "YOU", pts: "pts", empty: "No players with points yet.", your: "Your rank", ai: "AI", today: "Today", total: "Total" },
  fr: { title: "Classement", reload: "Recharger", you: "TOI", pts: "pts", empty: "Aucun joueur avec des points.", your: "Ton rang", ai: "IA", today: "Aujourd'hui", total: "Total" },
  pt: { title: "Ranking de jogadores", reload: "Recarregar", you: "VOCÊ", pts: "pts", empty: "Ainda sem jogadores com pontos.", your: "Sua posição", ai: "IA", today: "Hoje", total: "Total" },
};

export default function RankingPanel() {
  const { lang, user } = useApp();
  const t = TXT[lang] || TXT.es;
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("total");   // "total" | "today"

  const load = useCallback(() => {
    setBusy(true);
    API.ranking()
      .then((d) => setData(d))
      .catch(() => setData({ ranking: [], ranking_today: [] }))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load, user]);
  useEffect(() => { const i = setInterval(load, 45000); return () => clearInterval(i); }, [load]);

  const today = tab === "today";
  const rows = data ? (today ? data.ranking_today : data.ranking) || [] : null;
  const ai = data ? (today ? data.ai_points_today : data.ai_points) : null;
  const pf = today ? "points_today" : "points";

  const mine = (rows || []).find((r) => r.me);
  const top = (rows || []).slice(0, 100);
  const showMineExtra = mine && !top.some((r) => r.me);

  const Row = (r, pinned) => (
    <div key={(pinned ? "p" : "") + r.id} className={"rankp-row" + (r.me ? " me" : "") + (pinned ? " pinned" : "")}>
      <span className="rk">{r.rank}</span>
      <span className="nm">{r.country && <img className="rkflag" src={flagUrl(r.country)} alt="" />}{r.name}{r.me && <em className="ywho">{t.you}</em>}</span>
      <span className="pt">{r[pf]}<small> {t.pts}</small></span>
    </div>
  );

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
      <div className="rankp-tabs">
        <button className={"rankp-tab" + (today ? "" : " on")} onClick={() => setTab("total")}>{t.total}</button>
        <button className={"rankp-tab" + (today ? " on" : "")} onClick={() => setTab("today")}>{t.today}</button>
      </div>
      {rows === null ? (
        <div className="note">…</div>
      ) : rows.length === 0 ? (
        <div className="note">{t.empty}</div>
      ) : (
        <div className="rankp-list">
          {showMineExtra && (<>{Row(mine, true)}<div className="rankp-sep" /></>)}
          {top.map((r) => Row(r, false))}
        </div>
      )}
    </div>
  );
}
