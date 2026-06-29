import I18N from "./i18n.json";

const LP = {
  es: { title: "Partido ahora", liveBadge: "● EN VIVO", nextBadge: "PRÓXIMO", lastBadge: "ÚLTIMO", updated: "Última actualización", kickoff: "Inicio", startsIn: "en", lastResult: "Último resultado", aiMissing: "Probabilidad IA: [N/D]", aiNext: "La IA da {p}% a {team} antes del partido", aiLive: "La IA daba {p}% a {team} — va {score}", impact: "Este resultado mueve tu predicción.", predInPlay: "Tu predicción está en juego.", sourceIssue: "FIFA no respondió; usando respaldo", yellow: "A", red: "R", yourPred: "Tu pronóstico", realResult: "Resultado real", realLive: "Resultado en vivo", notStarted: "aún no empieza", more: "Más partidos", real: "Real", playing: "EN VIVO", finalLbl: "FINAL", prematch: "Pronóstico · pre-partido", stats: { possession: "Posesión", shots: "Remates", sot: "Al arco", corners: "Córners", fouls: "Faltas", cards: "Tarjetas", xg: "xG" } },
  en: { title: "Match now", liveBadge: "● LIVE", nextBadge: "NEXT", lastBadge: "LATEST", updated: "Last update", kickoff: "Kickoff", startsIn: "in", lastResult: "Latest result", aiMissing: "AI probability: [N/D]", aiNext: "AI has {team} at {p}% before kickoff", aiLive: "AI had {team} at {p}% — now {score}", impact: "This result changes your prediction.", predInPlay: "Your prediction is in play.", sourceIssue: "FIFA did not respond; using fallback", yellow: "Y", red: "R", yourPred: "Your prediction", realResult: "Real score", realLive: "Live score", notStarted: "not started yet", more: "More matches", real: "Real", playing: "LIVE", finalLbl: "FINAL", prematch: "Prediction · pre-match", stats: { possession: "Possession", shots: "Shots", sot: "On target", corners: "Corners", fouls: "Fouls", cards: "Cards", xg: "xG" } },
  fr: { title: "Match en cours", liveBadge: "● EN DIRECT", nextBadge: "PROCHAIN", lastBadge: "DERNIER", updated: "Dernière mise à jour", kickoff: "Coup d'envoi", startsIn: "dans", lastResult: "Dernier résultat", aiMissing: "Probabilité IA : [N/D]", aiNext: "L'IA donne {p}% à {team} avant le match", aiLive: "L'IA donnait {p}% à {team} — actuellement {score}", impact: "Ce résultat change ta prédiction.", predInPlay: "Ta prédiction est en jeu.", sourceIssue: "FIFA n'a pas répondu ; secours utilisé", yellow: "J", red: "R", yourPred: "Ton pronostic", realResult: "Score réel", realLive: "Score en direct", notStarted: "pas encore commencé", more: "Plus de matchs", real: "Réel", playing: "EN DIRECT", finalLbl: "FINAL", prematch: "Pronostic · avant-match", stats: { possession: "Possession", shots: "Tirs", sot: "Cadrés", corners: "Corners", fouls: "Fautes", cards: "Cartons", xg: "xG" } },
  pt: { title: "Jogo agora", liveBadge: "● AO VIVO", nextBadge: "PRÓXIMO", lastBadge: "ÚLTIMO", updated: "Última atualização", kickoff: "Início", startsIn: "em", lastResult: "Último resultado", aiMissing: "Probabilidade IA: [N/D]", aiNext: "A IA dá {p}% ao {team} antes do jogo", aiLive: "A IA dava {p}% ao {team} — está {score}", impact: "Este resultado muda seu palpite.", predInPlay: "Seu palpite está em jogo.", sourceIssue: "FIFA não respondeu; usando alternativa", yellow: "A", red: "V", yourPred: "Seu palpite", realResult: "Resultado real", realLive: "Resultado ao vivo", notStarted: "ainda não começou", more: "Mais jogos", real: "Real", playing: "AO VIVO", finalLbl: "FINAL", prematch: "Palpite · pré-jogo", stats: { possession: "Posse", shots: "Finalizações", sot: "No alvo", corners: "Escanteios", fouls: "Faltas", cards: "Cartões", xg: "xG" } },
};

export const EXTRA = {
  es: { livePanel: LP.es, pred: "Pronóstico", whoAdv: "Empate · ¿quién avanza?", compact: "Compactar 16/8/4", expand: "Expandir 16/8/4", ptitle: "Cómo se suman los puntos", pdesc: "Aciertan al ganador de un cruce y suman los puntos de esa ronda. Si tu acierto era una sorpresa (gana el de menor probabilidad), multiplica hasta ×3.", prounds: "Por ronda", proundsline: "16avos 1 · 8vos 2 · 4tos 3 · Semis 5 · Final 8", psurp: "Sorpresa hasta ×3", hide: "Ocultar columna", show: "Mostrar", newpass: "Nueva contraseña", repeatpass: "Repetir contraseña", setpass: "Guardar contraseña", resetTitle: "Define tu nueva contraseña", invalidLink: "El enlace no es válido o caducó.", logout: "Salir", profile: "Mi perfil", admin: "Panel admin", login: "Iniciar sesión", register: "Registrarse", foot: 'Datos: swarm Kimi · motor Monte Carlo por Elo, no predicción · la "IA" es este mismo motor.' },
  en: { livePanel: LP.en, pred: "Prediction", whoAdv: "Tie · who advances?", compact: "Collapse 16/8/4", expand: "Expand 16/8/4", ptitle: "How points add up", pdesc: "Call the winner of a tie and you bank that round’s points. If your call was an upset (the underdog wins), it multiplies up to ×3.", prounds: "Per round", proundsline: "R32 1 · R16 2 · QF 3 · SF 5 · Final 8", psurp: "Upset up to ×3", hide: "Hide column", show: "Show", newpass: "New password", repeatpass: "Repeat password", setpass: "Save password", resetTitle: "Set your new password", invalidLink: "This link is invalid or expired.", logout: "Log out", profile: "My profile", admin: "Admin panel", login: "Log in", register: "Sign up", foot: 'Data: Kimi swarm · Monte Carlo engine by Elo, not prediction · the "AI" is this same engine.' },
  fr: { livePanel: LP.fr, pred: "Pronostic", whoAdv: "Égalité · qui passe ?", compact: "Réduire 16/8/4", expand: "Étendre 16/8/4", ptitle: "Comment les points s’additionnent", pdesc: "Trouvez le vainqueur d’un duel et vous empochez les points du tour. Si c’était une surprise (l’outsider gagne), cela multiplie jusqu’à ×3.", prounds: "Par tour", proundsline: "16es 1 · 8es 2 · 1/4 3 · 1/2 5 · Finale 8", psurp: "Surprise jusqu’à ×3", hide: "Masquer la colonne", show: "Afficher", newpass: "Nouveau mot de passe", repeatpass: "Répéter le mot de passe", setpass: "Enregistrer", resetTitle: "Définis ton nouveau mot de passe", invalidLink: "Ce lien est invalide ou expiré.", logout: "Déconnexion", profile: "Mon profil", admin: "Admin", login: "Connexion", register: "S’inscrire", foot: "Données : swarm Kimi · moteur Monte Carlo par Elo, pas une prédiction · l'IA, c'est ce moteur." },
  pt: { livePanel: LP.pt, pred: "Palpite", whoAdv: "Empate · quem avança?", compact: "Compactar 16/8/4", expand: "Expandir 16/8/4", ptitle: "Como somam os pontos", pdesc: "Acerte o vencedor de um confronto e some os pontos daquela rodada. Se o acerto foi uma zebra (vence o azarão), multiplica até ×3.", prounds: "Por rodada", proundsline: "32avos 1 · Oitavas 2 · Quartas 3 · Semis 5 · Final 8", psurp: "Zebra até ×3", hide: "Ocultar coluna", show: "Mostrar", newpass: "Nova senha", repeatpass: "Repetir senha", setpass: "Salvar senha", resetTitle: "Defina sua nova senha", invalidLink: "O link é inválido ou expirou.", logout: "Sair", profile: "Meu perfil", admin: "Painel admin", login: "Entrar", register: "Cadastrar", foot: 'Dados: swarm Kimi · motor Monte Carlo por Elo, não predição · a "IA" é este mesmo motor.' },
};

export const ROUND_LABELS = {
  es: ["Dieciseisavos", "Octavos", "Cuartos", "Semifinal", "Final"],
  en: ["Round of 32", "Round of 16", "Quarters", "Semis", "Final"],
  fr: ["16es", "8es", "Quarts", "Demies", "Finale"],
  pt: ["32 avos", "Oitavas", "Quartas", "Semifinal", "Final"],
};

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
