import { Iso } from "./ui.jsx";
import Bracket from "./Bracket.jsx";
import LivePanel from "./LivePanel.jsx";
import { HoverPopLayer } from "./MatchCard.jsx";
import MasterTable from "./MasterTable.jsx";
import VsBar from "./VsBar.jsx";
import RankingPanel from "./RankingPanel.jsx";
import { L, LX } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

export default function Simulator() {
  const { lang, setLang, boot, user, isAdmin, mode, setMode, setModal } = useApp();

  if (!boot) {
    return (
      <div className="center-screen">
        <div style={{ textAlign: "center", color: "var(--taupe)" }}>
          <Iso size={40} /><div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 12 }}>Cargando…</div>
        </div>
      </div>
    );
  }

  const l = L(lang), lx = LX(lang);
  const openTeam = (name) => setModal({ type: "team", data: { name } });

  return (
    <div className="wrap">
      <HoverPopLayer />
      <div className="top">
        <div className="brand">
          <Iso /><span><span className="faber">Faber</span><span className="loom">Loom</span></span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="lang">
            {["es", "en", "fr", "pt"].map((g) => (
              <button key={g} className={lang === g ? "on" : ""} onClick={() => setLang(g)}>{g.toUpperCase()}</button>
            ))}
          </div>
          <AuthBar />
        </div>
      </div>

      <div className="hero">
        <span className="live"><span className="dot" />{l.live}</span>
        <h1 dangerouslySetInnerHTML={{ __html: l.htitle.replace(/\b(IA|AI)\b/, "<em>$1</em>") }} />
        <div className="hsub">{l.hsub}</div>
      </div>

      <LivePanel />

      <div className="onb">
        {l.onb.map((o, i) => <div key={i}><b>{i + 1}</b> {o}</div>)}
      </div>

      <RankingPanel />

      <VsBar />

      <div className="bar">
        <button className={mode === "pick" ? "on" : "ghost"} onClick={() => setMode("pick")}>{l.mybr}</button>
        {isAdmin ? (
          <button className={mode === "result" ? "on" : "ghost"} onClick={() => setMode("result")}>{l.loadres}</button>
        ) : (
          <button className="ghost" onClick={() => setModal(user ? { type: "profile" } : { type: "login" })}>{lx.profile}</button>
        )}
      </div>

      <div className="points">
        <b>{lx.ptitle}.</b> {lx.pdesc}
        <div className="pr">
          <span>{lx.prounds}: {lx.proundsline}</span>
          <span>{lx.psurp}</span>
        </div>
      </div>

      <div className="sec">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <h3 style={{ margin: 0 }}>{l.mybr}</h3>
        </div>
        <Bracket onOpenTeam={openTeam} />
      </div>

      <div className="sec">
        <h3>{l.mktmodel}</h3>
        <MasterTable query="" onOpenTeam={openTeam} />
      </div>

      <div className="whatis">
        <h3>{l.whatis}</h3>
        <div style={{ fontSize: 13, opacity: 0.92 }}>{l.whatistxt}</div>
        <button onClick={() => setModal(user ? { type: "profile" } : { type: "register" })}>faberloom.ai</button>
      </div>

      <div className="foot">
        {lx.foot} faberloom.ai
      </div>
    </div>
  );
}

function AuthBar() {
  const { lang, user, isAdmin, setModal, logout } = useApp();
  const lx = LX(lang);
  if (!user)
    return (
      <div className="authbar">
        <button className="ghost sm" onClick={() => setModal({ type: "login" })}>{lx.login}</button>
        <button className="coral sm" onClick={() => setModal({ type: "register" })}>{lx.register}</button>
      </div>
    );
  return (
    <div className="authbar">
      <span className="ubadge">{isAdmin ? "★ " : ""}{user.name || user.email}</span>
      {isAdmin
        ? <button className="ghost sm" onClick={() => setModal({ type: "admin" })}>{lx.admin}</button>
        : <button className="ghost sm" onClick={() => setModal({ type: "profile" })}>{lx.profile}</button>}
      <button className="ghost sm" onClick={logout}>{lx.logout}</button>
    </div>
  );
}
