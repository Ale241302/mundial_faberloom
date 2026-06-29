// País ISO-2 (minúscula) -> nombre. Para el selector de perfil y la bandera.
export const COUNTRIES = [
  ["ar", "Argentina"], ["bo", "Bolivia"], ["br", "Brasil"], ["cl", "Chile"],
  ["co", "Colombia"], ["cr", "Costa Rica"], ["cu", "Cuba"], ["do", "Rep. Dominicana"],
  ["ec", "Ecuador"], ["sv", "El Salvador"], ["gt", "Guatemala"], ["hn", "Honduras"],
  ["mx", "México"], ["ni", "Nicaragua"], ["pa", "Panamá"], ["py", "Paraguay"],
  ["pe", "Perú"], ["pr", "Puerto Rico"], ["uy", "Uruguay"], ["ve", "Venezuela"],
  ["us", "Estados Unidos"], ["ca", "Canadá"],
  ["es", "España"], ["pt", "Portugal"], ["fr", "Francia"], ["it", "Italia"],
  ["de", "Alemania"], ["gb", "Reino Unido"], ["nl", "Países Bajos"], ["be", "Bélgica"],
  ["ch", "Suiza"], ["at", "Austria"], ["ie", "Irlanda"], ["se", "Suecia"],
  ["no", "Noruega"], ["dk", "Dinamarca"], ["fi", "Finlandia"], ["pl", "Polonia"],
  ["cz", "Chequia"], ["gr", "Grecia"], ["ro", "Rumanía"], ["hr", "Croacia"],
  ["rs", "Serbia"], ["ua", "Ucrania"], ["ru", "Rusia"], ["tr", "Turquía"],
  ["ma", "Marruecos"], ["dz", "Argelia"], ["tn", "Túnez"], ["eg", "Egipto"],
  ["za", "Sudáfrica"], ["ng", "Nigeria"], ["gh", "Ghana"], ["sn", "Senegal"],
  ["ci", "Costa de Marfil"], ["cm", "Camerún"], ["cd", "RD Congo"], ["cv", "Cabo Verde"],
  ["jp", "Japón"], ["kr", "Corea del Sur"], ["cn", "China"], ["in", "India"],
  ["au", "Australia"], ["nz", "Nueva Zelanda"], ["sa", "Arabia Saudí"], ["qa", "Catar"],
  ["ir", "Irán"], ["iq", "Irak"], ["il", "Israel"], ["ae", "Emiratos Árabes"],
  ["id", "Indonesia"], ["ph", "Filipinas"], ["th", "Tailandia"], ["vn", "Vietnam"],
].sort((a, b) => a[1].localeCompare(b[1]));

export const countryName = (code) => {
  const c = (COUNTRIES.find((x) => x[0] === (code || "").toLowerCase()) || [])[1];
  return c || "";
};
export const flagUrl = (code) => code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : "";
