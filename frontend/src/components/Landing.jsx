import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../lib/api.js";
import "../styles/landing.css";

const I18N = {
  es: {
    nav_mundial: "Simulador Mundial ↗",
    hero_eyebrow: "Pronto · entrá a la lista",
    hero_h1a: "Asistentes de IA que", hero_h1b: "de verdad hacen el trabajo.",
    hero_lead: "No son chatbots. Son agentes que ejecutan tus tareas repetitivas, en tu computadora, con tus datos y bajo tu control. FaberLoom todavía no salió — sé de los primeros en usarlo.",
    ph_email: "tu@correo.com", cta_join: "Avisame →",
    cta_try: "Probá el simulador del Mundial →",
    form_note: "Solo para avisarte cuando lance. Sin spam.",
    proof_eyebrow: "Prueba, no promesa",
    proof_h2: "Este Mundial lo simula un agente FaberLoom. El modelo, los datos y la interfaz — hechos solo.",
    proof_p: "Pronosticá cada ronda y mirá si le ganás a la IA. Es lo mismo que un agente puede armar para vos: trabajo real, de principio a fin.",
    proof_cta: "Jugar y ganarle a la IA →",
    vp_eyebrow: "Qué es FaberLoom",
    vp_h2: "Un agente que ejecuta, no un chat que responde.",
    vp1_h: "Hace el trabajo", vp1_p: "Ejecuta tus tareas repetitivas de principio a fin. No te tira texto para que lo hagas vos — lo hace.",
    vp2_h: "En tu espacio", vp2_p: "Trabaja en tu computadora, con tu información. Vos decidís qué ve y qué toca. Tus datos no se van a ningún lado.",
    vp3_h: "Gana autonomía", vp3_p: "Empieza pidiendo permiso en cada paso. A medida que confiás, hace más solo. Vos marcás el ritmo.",
    band_eyebrow: "Lista de espera",
    band_h2: "Sé de los primeros en tejer el tuyo.",
    band_p: "FaberLoom abre de a poco. Dejá tu correo y te avisamos antes que a nadie cuando puedas entrar.",
    foot_mundial: "Simulador Mundial",
    msg_ok: "¡Listo! Te avisamos apenas abramos.", msg_dup: "Ya estabas en la lista. ✓",
    msg_bad: "Revisá el correo — parece que falta algo.", msg_err: "Algo falló. Probá de nuevo en un momento.",
  },
  en: {
    nav_mundial: "World Cup Simulator ↗",
    hero_eyebrow: "Coming soon · join the list",
    hero_h1a: "AI assistants that", hero_h1b: "actually do the work.",
    hero_lead: "Not chatbots. Agents that run your repetitive tasks, on your computer, with your data and under your control. FaberLoom isn't out yet — be among the first to use it.",
    ph_email: "you@email.com", cta_join: "Notify me →",
    cta_try: "Try the World Cup simulator →",
    form_note: "Only to tell you when it launches. No spam.",
    proof_eyebrow: "Proof, not a promise",
    proof_h2: "This World Cup is run by a FaberLoom agent. The model, the data and the interface — built on its own.",
    proof_p: "Pick every round and see if you can beat the AI. It's the same thing an agent can build for you: real work, end to end.",
    proof_cta: "Play and beat the AI →",
    vp_eyebrow: "What FaberLoom is",
    vp_h2: "An agent that executes, not a chat that replies.",
    vp1_h: "It does the work", vp1_p: "Runs your repetitive tasks end to end. It doesn't hand you text to do yourself — it does it.",
    vp2_h: "In your space", vp2_p: "Works on your computer, with your information. You decide what it sees and touches. Your data stays put.",
    vp3_h: "Earns autonomy", vp3_p: "Starts by asking permission at every step. As you trust it, it does more on its own. You set the pace.",
    band_eyebrow: "Waitlist",
    band_h2: "Be among the first to build your own.",
    band_p: "FaberLoom opens gradually. Drop your email and we'll tell you before anyone else when you can get in.",
    foot_mundial: "World Cup Simulator",
    msg_ok: "Done! We'll tell you the moment we open.", msg_dup: "You were already on the list. ✓",
    msg_bad: "Check the email — something looks off.", msg_err: "Something failed. Try again in a moment.",
  },
  fr: {
    nav_mundial: "Simulateur Coupe du Monde ↗",
    hero_eyebrow: "Bientôt · rejoins la liste",
    hero_h1a: "Des assistants IA qui", hero_h1b: "font vraiment le travail.",
    hero_lead: "Pas des chatbots. Des agents qui exécutent tes tâches répétitives, sur ton ordinateur, avec tes données et sous ton contrôle. FaberLoom n'est pas encore sorti — sois parmi les premiers.",
    ph_email: "toi@email.com", cta_join: "Préviens-moi →",
    cta_try: "Essaie le simulateur de la Coupe →",
    form_note: "Uniquement pour te prévenir au lancement. Pas de spam.",
    proof_eyebrow: "Une preuve, pas une promesse",
    proof_h2: "Cette Coupe du Monde tourne sur un agent FaberLoom. Le modèle, les données et l'interface — faits tout seul.",
    proof_p: "Pronostique chaque tour et vois si tu bats l'IA. C'est ce qu'un agent peut construire pour toi : du vrai travail, de bout en bout.",
    proof_cta: "Jouer et battre l'IA →",
    vp_eyebrow: "C'est quoi FaberLoom",
    vp_h2: "Un agent qui exécute, pas un chat qui répond.",
    vp1_h: "Il fait le travail", vp1_p: "Exécute tes tâches répétitives de bout en bout. Il ne te donne pas du texte à faire toi-même — il le fait.",
    vp2_h: "Dans ton espace", vp2_p: "Travaille sur ton ordinateur, avec tes informations. Tu décides ce qu'il voit et touche. Tes données restent chez toi.",
    vp3_h: "Gagne en autonomie", vp3_p: "Commence en demandant la permission à chaque étape. Au fur et à mesure que tu lui fais confiance, il en fait plus seul. Tu donnes le rythme.",
    band_eyebrow: "Liste d'attente",
    band_h2: "Sois parmi les premiers à créer le tien.",
    band_p: "FaberLoom ouvre progressivement. Laisse ton email et on te prévient avant tout le monde quand tu pourras entrer.",
    foot_mundial: "Simulateur Coupe du Monde",
    msg_ok: "C'est fait ! On te prévient dès l'ouverture.", msg_dup: "Tu étais déjà sur la liste. ✓",
    msg_bad: "Vérifie l'email — il manque quelque chose.", msg_err: "Échec. Réessaie dans un instant.",
  },
};

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pickLang = () => {
  try { const s = localStorage.getItem("fl_lang"); if (s && I18N[s]) return s; } catch (e) {}
  const n = (navigator.language || "es").slice(0, 2).toLowerCase();
  return I18N[n] ? n : "es";
};

const Logo = ({ size = 27 }) => (
  <svg viewBox="0 0 48 48" fill="none" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
    <g stroke="var(--coral)" strokeWidth="3.5" strokeLinecap="round">
      <path d="M14 7 V19" /><path d="M14 29 V41" /><path d="M24 7 V9" /><path d="M24 19 V29" /><path d="M24 39 V41" />
      <path d="M34 7 V19" /><path d="M34 29 V41" /><path d="M7 14 H9" /><path d="M19 14 H29" /><path d="M39 14 H41" />
      <path d="M7 24 H19" /><path d="M29 24 H41" /><path d="M7 34 H9" /><path d="M19 34 H29" /><path d="M39 34 H41" />
    </g>
  </svg>
);

function Capture({ lang, centered }) {
  const t = I18N[lang];
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState({ cls: "", text: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!validEmail(email.trim())) { setMsg({ cls: "err", text: t.msg_bad }); return; }
    setBusy(true);
    try {
      const res = await API.waitlist({ email: email.trim(), lang });
      try { localStorage.setItem("fl_pending", JSON.stringify({ email: email.trim(), token: res.token })); } catch (_) {}
      setMsg({ cls: "ok", text: res.existed ? t.msg_dup : t.msg_ok });
      setEmail("");
    } catch (err) {
      setMsg({ cls: "err", text: t.msg_err });
    } finally { setBusy(false); }
  };

  return (
    <>
      <form className="capture" onSubmit={submit} noValidate style={centered ? { margin: "0 auto", justifyContent: "center" } : undefined}>
        <input type="email" placeholder={t.ph_email} autoComplete="email" required aria-label="Correo electrónico"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}>{busy ? "…" : t.cta_join}</button>
      </form>
      <div className={"formmsg " + msg.cls} role="status" aria-live="polite">{msg.text}</div>
    </>
  );
}

export default function Landing() {
  const [lang, setLang] = useState(pickLang);
  const nav = useNavigate();
  const t = I18N[lang];
  const fontRef = useRef(false);

  useEffect(() => {
    try { localStorage.setItem("fl_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (fontRef.current) return; fontRef.current = true;
    if (!document.getElementById("lp-fonts")) {
      const l = document.createElement("link");
      l.id = "lp-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const toSim = () => nav("/simulador");

  return (
    <div className="lp">
      <header className="nav">
        <div className="wrap nav-in">
          <a className="brand" onClick={toSim} style={{ cursor: "pointer" }}>
            <Logo /><span className="name">FaberLoom</span>
          </a>
          <span className="spacer" />
          <a className="link hideSm" onClick={toSim}>{t.nav_mundial}</a>
          <div className="langsel" role="group" aria-label="Idioma">
            {["es", "en", "fr"].map((g) => (
              <button key={g} className={lang === g ? "on" : ""} onClick={() => setLang(g)}>{g.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="weavebg" />
        <div className="wrap hero-in">
          <span className="eyebrow">{t.hero_eyebrow}</span>
          <h1>{t.hero_h1a} <span className="it coral">{t.hero_h1b}</span></h1>
          <p className="lead">{t.hero_lead}</p>
          <Capture lang={lang} />
          <div className="cta-row">
            <a className="btn ghost" onClick={toSim}>{t.cta_try}</a>
          </div>
          <div className="formnote">{t.form_note}</div>
        </div>
      </section>

      <section className="proof">
        <div className="wrap">
          <div className="proofcard">
            <div className="txt">
              <span className="eyebrow">{t.proof_eyebrow}</span>
              <h2>{t.proof_h2}</h2>
              <p>{t.proof_p}</p>
              <a className="btn" onClick={toSim}>{t.proof_cta}</a>
            </div>
            <div className="mini" aria-hidden="true">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Mundial 2026 · 16avos</div>
              <div className="bar"><span>🇦🇷</span> Argentina <span className="pct">71%</span></div>
              <div className="meter"><i style={{ width: "71%", background: "var(--coral-l)" }} /><i style={{ width: "29%", background: "var(--slate)" }} /></div>
              <div className="bar"><span>🇧🇷</span> Brasil <span className="pct">64%</span></div>
              <div className="meter"><i style={{ width: "64%", background: "var(--coral-l)" }} /><i style={{ width: "36%", background: "var(--slate)" }} /></div>
              <div className="bar"><span>🇫🇷</span> Francia <span className="pct">68%</span></div>
              <div className="meter"><i style={{ width: "68%", background: "var(--coral-l)" }} /><i style={{ width: "32%", background: "var(--slate)" }} /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="vp">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow">{t.vp_eyebrow}</span>
            <h2>{t.vp_h2}</h2>
          </div>
          <div className="grid">
            <div className="card">
              <div className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
              <h3>{t.vp1_h}</h3><p>{t.vp1_p}</p>
            </div>
            <div className="card">
              <div className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 21h8M12 18v3" /></svg></div>
              <h3>{t.vp2_h}</h3><p>{t.vp2_p}</p>
            </div>
            <div className="card">
              <div className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M5 10l7-7 7 7" /></svg></div>
              <h3>{t.vp3_h}</h3><p>{t.vp3_p}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <span className="eyebrow">{t.band_eyebrow}</span>
          <h2>{t.band_h2}</h2>
          <p>{t.band_p}</p>
          <Capture lang={lang} centered />
        </div>
      </section>

      <footer>
        <div className="wrap foot-in">
          <span className="brand" style={{ gap: 7 }}>
            <Logo size={16} />
            <b style={{ fontFamily: "var(--display)", fontStyle: "italic", color: "var(--ink)" }}>FaberLoom</b>
          </span>
          <span className="spacer" />
          <a onClick={toSim}>{t.foot_mundial}</a>
          <span>·</span>
          <a href="mailto:hola@faberloom.ai">hola@faberloom.ai</a>
          <span>·</span>
          <span>© 2026 FaberLoom</span>
        </div>
      </footer>
    </div>
  );
}
