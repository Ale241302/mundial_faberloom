import { useState } from "react";
import { API } from "../lib/api.js";
import { useApp } from "../lib/store.jsx";

const T = {
  es: {
    tag: "Patrocinado por", cta: "Pre-registro en RanaWalk", done: "Pre-registrado",
    inMsg: "¿Querés ser de los primeros en RanaWalk? Quienes se sumen ahora reciben un cupón de descuento en el lanzamiento.",
    ask: "Dejá tu correo y te pre-registramos en RanaWalk. Te avisamos en el lanzamiento, con un cupón de descuento de regalo.",
    confirm: "Pre-registrarme", placeholder: "tu@correo.com",
    thanks: "¡Listo! Estás pre-registrado en RanaWalk. Te enviamos un correo de confirmación.", bad: "Escribe un correo válido",
  },
  en: {
    tag: "Sponsored by", cta: "Pre-register for RanaWalk", done: "Pre-registered",
    inMsg: "Want to be among the first on RanaWalk? Everyone who joins now gets a discount coupon at launch.",
    ask: "Leave your email and we'll pre-register you for RanaWalk. We'll notify you at launch with a discount coupon.",
    confirm: "Pre-register me", placeholder: "you@email.com",
    thanks: "Done! You're pre-registered for RanaWalk. We've sent you a confirmation email.", bad: "Enter a valid email",
  },
  fr: {
    tag: "Sponsorisé par", cta: "Pré-inscription à RanaWalk", done: "Pré-inscrit",
    inMsg: "Tu veux être parmi les premiers sur RanaWalk ? Ceux qui rejoignent maintenant reçoivent un coupon de réduction au lancement.",
    ask: "Laisse ton e-mail et on te pré-inscrit à RanaWalk. On te prévient au lancement, avec un coupon de réduction.",
    confirm: "Me pré-inscrire", placeholder: "toi@email.com",
    thanks: "C'est fait ! Tu es pré-inscrit à RanaWalk. On t'a envoyé un e-mail de confirmation.", bad: "Saisis un e-mail valide",
  },
  pt: {
    tag: "Patrocinado por", cta: "Pré-cadastro no RanaWalk", done: "Pré-cadastrado",
    inMsg: "Quer ser um dos primeiros no RanaWalk? Quem entra agora ganha um cupom de desconto no lançamento.",
    ask: "Deixe seu e-mail e te pré-cadastramos no RanaWalk. Avisamos no lançamento, com um cupom de desconto.",
    confirm: "Quero me pré-cadastrar", placeholder: "voce@email.com",
    thanks: "Pronto! Você está pré-cadastrado no RanaWalk. Enviamos um e-mail de confirmação.", bad: "Digite um e-mail válido",
  },
};

export default function RanaSponsor({ lang }) {
  const { user, toast } = useApp();
  const t = T[lang] || T.es;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const send = async (payload) => {
    setBusy(true);
    try {
      await API.ranawalk({ ...payload, lang });
      setDone(true); setOpen(false);
      if (toast) toast(t.thanks);
    } catch (e) {
      if (toast) toast(e.message || t.bad);
    } finally { setBusy(false); }
  };
  const onSend = () => {
    if (!email || !email.includes("@")) { if (toast) toast(t.bad); return; }
    send({ email });
  };

  return (
    <div className={"rana" + (done ? " is-done" : "")}>
      <div className="rana-bar">
        <span className="rana-tag">
          <span className="rana-spk">{t.tag}</span>
          <img className="rana-logo-img"
            src="https://ranawalk.com/images/logos%20rana/Logo-Rana-Walk-full-color_vertical.png"
            alt="RanaWalk" role="button" title={t.cta}
            onClick={() => !done && setOpen((o) => !o)} />
        </span>
        <button className="rana-cta" onClick={() => !done && setOpen((o) => !o)} disabled={busy || done}>
          {done ? "✓ " + t.done : t.cta}
        </button>
      </div>
      {done && <div className="rana-note">{t.thanks}</div>}
      {open && !done && (
        <div className="rana-form">
          <p>{user ? t.inMsg : t.ask}</p>
          {!user && (
            <input type="email" value={email} placeholder={t.placeholder}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()} />
          )}
          <button className="rana-cta full" onClick={() => (user ? send({}) : onSend())} disabled={busy}>
            {t.confirm}
          </button>
        </div>
      )}
    </div>
  );
}
