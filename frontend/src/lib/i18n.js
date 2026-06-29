import I18N from "./i18n.json";

// Cadenas extra (no traducibles en el JSON principal).
export const EXTRA = {
  es: { pred: "Pronóstico", whoAdv: "Empate · ¿quién avanza?", compact: "Compactar 16/8/4", expand: "Expandir 16/8/4", ptitle: "Cómo se suman los puntos", pdesc: "Aciertan al ganador de un cruce y suman los puntos de esa ronda. Si tu acierto era una sorpresa (gana el de menor probabilidad), multiplica hasta ×3.", prounds: "Por ronda", psurp: "Sorpresa hasta ×3", hide: "Ocultar columna", show: "Mostrar", newpass: "Nueva contraseña", repeatpass: "Repetir contraseña", setpass: "Guardar contraseña", resetTitle: "Define tu nueva contraseña", invalidLink: "El enlace no es válido o caducó.", logout: "Salir", profile: "Mi perfil", admin: "Panel admin", login: "Iniciar sesión", register: "Registrarse" },
  en: { pred: "Prediction", whoAdv: "Tie · who advances?", compact: "Collapse 16/8/4", expand: "Expand 16/8/4", ptitle: "How points add up", pdesc: "Call the winner of a tie and you bank that round’s points. If your call was an upset (the underdog wins), it multiplies up to ×3.", prounds: "Per round", psurp: "Upset up to ×3", hide: "Hide column", show: "Show", newpass: "New password", repeatpass: "Repeat password", setpass: "Save password", resetTitle: "Set your new password", invalidLink: "This link is invalid or expired.", logout: "Log out", profile: "My profile", admin: "Admin panel", login: "Log in", register: "Sign up" },
  fr: { pred: "Pronostic", whoAdv: "Égalité · qui passe ?", compact: "Réduire 16/8/4", expand: "Étendre 16/8/4", ptitle: "Comment les points s’additionnent", pdesc: "Trouvez le vainqueur d’un duel et vous empochez les points du tour. Si c’était une surprise (l’outsider gagne), cela multiplie jusqu’à ×3.", prounds: "Par tour", psurp: "Surprise jusqu’à ×3", hide: "Masquer la colonne", show: "Afficher", newpass: "Nouveau mot de passe", repeatpass: "Répéter le mot de passe", setpass: "Enregistrer", resetTitle: "Définis ton nouveau mot de passe", invalidLink: "Ce lien est invalide ou expiré.", logout: "Déconnexion", profile: "Mon profil", admin: "Admin", login: "Connexion", register: "S’inscrire" },
  pt: { pred: "Palpite", whoAdv: "Empate · quem avança?", compact: "Compactar 16/8/4", expand: "Expandir 16/8/4", ptitle: "Como somam os pontos", pdesc: "Acerte o vencedor de um confronto e some os pontos daquela rodada. Se o acerto foi uma zebra (vence o azarão), multiplica até ×3.", prounds: "Por rodada", psurp: "Zebra até ×3", hide: "Ocultar coluna", show: "Mostrar", newpass: "Nova senha", repeatpass: "Repetir senha", setpass: "Salvar senha", resetTitle: "Defina sua nova senha", invalidLink: "O link é inválido ou expirou.", logout: "Sair", profile: "Meu perfil", admin: "Painel admin", login: "Entrar", register: "Cadastrar" },
};

export const ROUND_LABELS = {
  es: ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"],
  en: ["Round of 32", "Round of 16", "Quarters", "Semis", "Final"],
  fr: ["16es", "8es", "Quarts", "Demies", "Finale"],
  pt: ["32 avos", "Oitavas", "Quartas", "Semifinal", "Final"],
};

// Nombres de selección por idioma. La clave es el nombre canónico (español, como
// viene de la BD). Solo cambia el TEXTO mostrado; la lógica del cuadro sigue
// usando el nombre canónico.
const TEAMS_I18N = {
  "Alemania": { en: "Germany", fr: "Allemagne", pt: "Alemanha" },
  "Paraguay": { en: "Paraguay", fr: "Paraguay", pt: "Paraguai" },
  "Francia": { en: "France", fr: "France", pt: "França" },
  "Suecia": { en: "Sweden", fr: "Suède", pt: "Suécia" },
  "Sudáfrica": { en: "South Africa", fr: "Afrique du Sud", pt: "África do Sul" },
  "Canadá": { en: "Canada", fr: "Canada", pt: "Canadá" },
  "P. Bajos": { en: "Netherlands", fr: "Pays-Bas", pt: "Países Baixos" },
  "Marruecos": { en: "Morocco", fr: "Maroc", pt: "Marrocos" },
  "Portugal": { en: "Portugal", fr: "Portugal", pt: "Portugal" },
  "Croacia": { en: "Croatia", fr: "Croatie", pt: "Croácia" },
  "España": { en: "Spain", fr: "Espagne", pt: "Espanha" },
  "Austria": { en: "Austria", fr: "Autriche", pt: "Áustria" },
  "EE.UU.": { en: "USA", fr: "États-Unis", pt: "EUA" },
  "Bosnia": { en: "Bosnia", fr: "Bosnie", pt: "Bósnia" },
  "Bélgica": { en: "Belgium", fr: "Belgique", pt: "Bélgica" },
  "Senegal": { en: "Senegal", fr: "Sénégal", pt: "Senegal" },
  "Brasil": { en: "Brazil", fr: "Brésil", pt: "Brasil" },
  "Japón": { en: "Japan", fr: "Japon", pt: "Japão" },
  "C. Marfil": { en: "Ivory Coast", fr: "Côte d'Ivoire", pt: "Costa do Marfim" },
  "Noruega": { en: "Norway", fr: "Norvège", pt: "Noruega" },
  "México": { en: "Mexico", fr: "Mexique", pt: "México" },
  "Ecuador": { en: "Ecuador", fr: "Équateur", pt: "Equador" },
  "Inglaterra": { en: "England", fr: "Angleterre", pt: "Inglaterra" },
  "RD Congo": { en: "DR Congo", fr: "RD Congo", pt: "RD Congo" },
  "Argentina": { en: "Argentina", fr: "Argentine", pt: "Argentina" },
  "Cabo Verde": { en: "Cape Verde", fr: "Cap-Vert", pt: "Cabo Verde" },
  "Australia": { en: "Australia", fr: "Australie", pt: "Austrália" },
  "Egipto": { en: "Egypt", fr: "Égypte", pt: "Egito" },
  "Suiza": { en: "Switzerland", fr: "Suisse", pt: "Suíça" },
  "Argelia": { en: "Algeria", fr: "Algérie", pt: "Argélia" },
  "Colombia": { en: "Colombia", fr: "Colombie", pt: "Colômbia" },
  "Ghana": { en: "Ghana", fr: "Ghana", pt: "Gana" },
};

// Traduce el nombre de una selección al idioma actual (es = canónico).
export function tn(name, lang) {
  if (!name || lang === "es") return name;
  const t = TEAMS_I18N[name];
  return (t && t[lang]) || name;
}

export const LANGS = ["es", "en", "fr", "pt"];

export function L(lang) { return I18N[lang] || I18N.es; }
export function LX(lang) { return EXTRA[lang] || EXTRA.es; }
export function detectLang() {
  const s = (navigator.language || "es").slice(0, 2);
  return I18N[s] ? s : "es";
}
export default I18N;
