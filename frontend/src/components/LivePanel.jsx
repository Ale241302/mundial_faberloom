import { useEffect, useMemo, useState } from "react";
import { Flag } from "./ui.jsx";
import { LX, tn } from "../lib/i18n.js";
import { useApp } from "../lib/store.jsx";

const ND = "[N/D]";

function fmtMinute(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return /['′]$/.test(s) ? s : `${s}'`;
}

function fmtPair(pair, suffix = "") {
  if (!pair || pair.home == null || pair.away == null) return ND;
  const mark = pair.estimated ? " ≈" : "";
  return `${pair.home}${suffix} - ${pair.away}${suffix}${mark}`;
}

function fmtDate(value, lang) {
  if (!value) return ND;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return ND;
  return d.toLocaleString(lang, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtUpdated(value, lang) {
  if (!value) return ND;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return ND;
  return d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function countdown(value, lang) {
  if (!value) return ND;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return ND;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return lang === "en" ? "now" : lang === "fr" ? "maintenant" : "ahora";
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hrs = Math.floor((mins % 1440) / 60);
  const mm = mins % 60;
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mm}m`;
  return `${mm}m`;
}

function scoreFor(match, label) {
  if (!match) return ND;
  if (match.score) return match.score;
  const h = match.home?.score;
  const a = match.away?.score;
  return h != null && a != null ? `${h}-${a}` : label;
}

function aiLine(match, lang, txt) {
  const p = match?.probabilities;
  if (!p?.favorite || p.favorite_prob == null) return txt.aiMissing;
  if (match.status === "scheduled") {
    return txt.aiNext.replace("{p}", p.favorite_prob).replace("{team}", p.favorite);
  }
  const score = scoreFor(match, ND);
  return txt.aiLive.replace("{p}", p.favorite_prob).replace("{team}", p.favorite).replace("{score}", score);
}

function TeamBlock({ side, align }) {
  return (
    <div className={`lp-team ${align || ""}`}>
      <Flag team={side?.name} big />
      <span>{side?.name || ND}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="lp-stat"><span>{label}</span><b>{value}</b></div>;
}

function StatsGrid({ match, txt }) {
  const s = match?.stats || {};
  const T = txt.stats || {};
  const cards = s.yellow_cards?.home != null && s.yellow_cards?.away != null
    ? `${txt.yellow} ${fmtPair(s.yellow_cards)}${s.red_cards?.home != null && s.red_cards?.away != null ? ` · ${txt.red} ${fmtPair(s.red_cards)}` : ""}`
    : (s.red_cards?.home != null && s.red_cards?.away != null ? `${txt.red} ${fmtPair(s.red_cards)}` : ND);
  return (
    <div className="lp-stats">
      <Stat label={T.possession} value={fmtPair(s.possession, "%")} />
      <Stat label={T.shots} value={fmtPair(s.shots)} />
      <Stat label={T.sot} value={fmtPair(s.shots_on_target)} />
      <Stat label={T.corners} value={fmtPair(s.corners)} />
      <Stat label={T.fouls} value={fmtPair(s.fouls)} />
      <Stat label={T.cards} value={cards} />
      <Stat label={T.xg} value={fmtPair(s.xg)} />
    </div>
  );
}

export default function LivePanel() {
  const { lang, livePanel, predictions, engine, boot, mc } = useApp();
  const txt = LX(lang).livePanel || {};
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const panel = livePanel || {};
  const hasLive = !!panel.in_play;
  const main = panel.in_play || panel.next_match || panel.last_result;
  const last = panel.last_result;
  const myp = (main && main.round != null && main.index != null)
    ? (predictions?.[main.round]?.[main.index] || predictions?.[String(main.round)]?.[String(main.index)] || {})
    : {};
  const myPick = myp.pick || "";
  const myScore = (myp.goal_a != null && myp.goal_b != null) ? `${myp.goal_a}–${myp.goal_b}` : "";
  const realScore = (main && (main.status === "live" || main.status === "finished")) ? (main.score || "") : "";
  const queue = (panel.queue || []).filter((q) => !(main && q.home === main.home?.name && q.away === main.away?.name)).slice(0, 6);
  const canPredictMain = !!(main && main.round != null && main.index != null && engine
    && !engine.lock(main.round, main.index) && !engine.played(main.round, main.index)
    && !engine.closed(main.round, main.index)
    && boot?.state?.rounds_enabled?.[String(main.round)]);

  const impact = useMemo(() => {
    if (!main || main.round == null || main.index == null) return "";
    const pred = predictions?.[main.round]?.[main.index] || predictions?.[String(main.round)]?.[String(main.index)];
    if (!pred?.pick) return "";
    const leader = main.current_leader || main.winner;
    if ((main.status === "live" || main.status === "finished") && leader && leader !== pred.pick) return txt.impact;
    if (main.status === "live") return txt.predInPlay;
    return "";
  }, [main, predictions, txt]);

  if (!main) return null;

  const badge = hasLive ? txt.liveBadge : (main.status === "scheduled" ? txt.nextBadge : txt.lastBadge);
  const minute = hasLive ? fmtMinute(main.minute) : "";
  const meta = main.status === "scheduled"
    ? `${txt.kickoff}: ${fmtDate(main.date || main.local_date, lang)} · ${txt.startsIn} ${countdown(main.date || main.local_date, lang)}`
    : `${main.stage || ""}${main.city ? ` · ${main.city}` : ""}`;

  return (
    <section className={`livepanel ${hasLive ? "is-live" : "is-fallback"}`}>
      <div className="lp-head">
        <div>
          <span className="lp-badge">{badge}{minute ? ` ${minute}` : ""}</span>
          <h2>{txt.title}</h2>
        </div>
        <div className="lp-upd">{txt.updated}: {fmtUpdated(panel.last_updated, lang)}</div>
      </div>

      <div className="lp-main">
        <TeamBlock side={main.home} align="left" />
        <div className="lp-scorebox">
          <div className="lp-score">{scoreFor(main, "vs")}</div>
          <div className="lp-ai">{aiLine(main, lang, txt)}</div>
          {impact && <div className="lp-impact">{impact}</div>}
        </div>
        <TeamBlock side={main.away} align="right" />
      </div>

      {main.round != null && main.index != null && (
        <div className="lp-pred">
          <span>Tu pronóstico</span>
          {canPredictMain ? (
            <span className="lp-predin">
              <input type="number" min="0" inputMode="numeric" aria-label={main.home?.name}
                value={myp.goal_a != null ? myp.goal_a : ""}
                onChange={(e) => mc.goal(main.round, main.index, "a", e.target.value, { a: main.home?.name, b: main.away?.name })} />
              <em>–</em>
              <input type="number" min="0" inputMode="numeric" aria-label={main.away?.name}
                value={myp.goal_b != null ? myp.goal_b : ""}
                onChange={(e) => mc.goal(main.round, main.index, "b", e.target.value, { a: main.home?.name, b: main.away?.name })} />
            </span>
          ) : (
            <b>{myPick ? `${tn(myPick, lang)}${myScore ? ` ${myScore}` : ""}` : "—"}</b>
          )}
          {myPick && <b className="lp-predwin">→ {tn(myPick, lang)}</b>}
          {realScore && <><span className="lp-sep">·</span><span>{main.status === "live" ? "En vivo" : "Resultado"}</span><b className="lp-realsc">{realScore}</b></>}
        </div>
      )}

      <div className="lp-meta">{meta || ND}</div>
      <StatsGrid match={main} txt={txt} />

      {!hasLive && last && last.id !== main.id && (
        <div className="lp-last">
          <span>{txt.lastResult}</span>
          <b>{last.home?.name || ND} {scoreFor(last, ND)} {last.away?.name || ND}</b>
          <small>{aiLine(last, lang, txt)}</small>
        </div>
      )}

      {queue.length > 0 && (
        <div className="lp-queue">
          <div className="lp-qh">Más partidos</div>
          {queue.map((q, k) => (
            <div className={"lp-qrow" + (q.status === "live" ? " is-live" : "")} key={k}>
              <span className="lp-qt"><Flag team={q.home} /> {tn(q.home, lang)}</span>
              <b className="lp-qsc">{q.status === "scheduled" ? "vs" : (q.score || "vs")}</b>
              <span className="lp-qt right">{tn(q.away, lang)} <Flag team={q.away} /></span>
              <em className="lp-qst">{q.status === "live" ? `EN VIVO ${q.minute || ""}` : (q.status === "finished" ? "FINAL" : fmtDate(q.date, lang))}</em>
            </div>
          ))}
        </div>
      )}

      {panel.source_status && panel.source_status !== "ok" && (
        <div className="lp-source">{txt.sourceIssue}: {panel.source_status}</div>
      )}
    </section>
  );
}
