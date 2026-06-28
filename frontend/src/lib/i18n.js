import I18N from "./i18n.json";

// Cadenas extra (no traducibles en el JSON principal).
export const EXTRA = {
  es: { pred: "Pronóstico", whoAdv: "Empate · ¿quién avanza?", compact: "Compactar 16/8/4", expand: "Expandir 16/8/4", ptitle: "Cómo se suman los puntos", pdesc: "Aciertan al ganador de un cruce y suman los puntos de esa ronda. Si tu acierto era una sorpresa (gana el de menor probabilidad), multiplica hasta ×3.", prounds: "Por ronda", psurp: "Sorpresa hasta ×3", hide: "Ocultar columna", show: "Mostrar", newpass: "Nueva contraseña", repeatpass: "Repetir contraseña", setpass: "Guardar contraseña", resetTitle: "Define tu nueva contraseña", invalidLink: "El enlace no es válido o caducó.", logout: "Salir", profile: "Mi perfil", admin: "Panel admin", login: "Iniciar sesión", register: "Registrarse" },
  en: { pred: "Prediction", whoAdv: "Tie · who advances?", compact: "Collapse 16/8/4", expand: "Expand 16/8/4", ptitle: "How points add up", pdesc: "Call the winner of a tie and you bank that round’s points. If your call was an upset (the underdog wins), it multiplies up to ×3.", prounds: "Per round", psurp: "Upset up to ×3", hide: "Hide column", show: "Show", newpass: "New password", repeatpass: "Repeat password", setpass: "Save password", resetTitle: "Set your new password", invalidLink: "This link is invalid or expired.", logout: "Log out", profile: "My profile", admin: "Admin panel", login: "Log in", register: "Sign up" },
  fr: { pred: "Pronostic", whoAdv: "Égalité · qui passe ?", compact: "Réduire 16/8/4", expand: "Étendre 16/8/4", ptitle: "Comment les points s’additionnent", pdesc: "Trouvez le vainqueur d’un duel et vous empochez les points du tour. Si c’était une surprise (l’outsider gagne), cela multiplie jusqu’à ×3.", prounds: "Par tour", psurp: "Surprise jusqu’à ×3", hide: "Masquer la colonne", show: "Afficher", newpass: "Nouveau mot de passe", repeatpass: "Répéter le mot de passe", setpass: "Enregistrer", resetTitle: "Définis ton nouveau mot de passe", invalidLink: "Ce lien est invalide ou expiré.", logout: "Déconnexion", profile: "Mon profil", admin: "Admin", login: "Connexion", register: "S’inscrire" },
};

export const ROUND_LABELS = {
  es: ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"],
  en: ["Round of 32", "Round of 16", "Quarters", "Semis", "Final"],
  fr: ["16es", "8es", "Quarts", "Demies", "Finale"],
};

export function L(lang) { return I18N[lang] || I18N.es; }
export function LX(lang) { return EXTRA[lang] || EXTRA.es; }
export function detectLang() {
  const s = (navigator.language || "es").slice(0, 2);
  return I18N[s] ? s : "es";
}
export default I18N;
