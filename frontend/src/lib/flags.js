// nombre de equipo -> código de bandera (flagcdn)
export const CC = {
  "Alemania": "de", "Paraguay": "py", "Francia": "fr", "Suecia": "se",
  "Sudáfrica": "za", "Canadá": "ca", "P. Bajos": "nl", "Marruecos": "ma",
  "Portugal": "pt", "Croacia": "hr", "España": "es", "Austria": "at",
  "EE.UU.": "us", "Bosnia": "ba", "Bélgica": "be", "Senegal": "sn",
  "Brasil": "br", "Japón": "jp", "C. Marfil": "ci", "Noruega": "no",
  "México": "mx", "Ecuador": "ec", "Inglaterra": "gb-eng", "RD Congo": "cd",
  "Argentina": "ar", "Cabo Verde": "cv", "Australia": "au", "Egipto": "eg",
  "Suiza": "ch", "Argelia": "dz", "Colombia": "co", "Ghana": "gh",
};

export function flagSrc(team, big) {
  const c = CC[team];
  if (!c) return null;
  return `https://flagcdn.com/${big ? "w320" : "w80"}/${c}.png`;
}
