const T = {
  es: { tag: "Patrocinado por", site: "Sitio Web" },
  en: { tag: "Sponsored by", site: "Website" },
  fr: { tag: "Sponsorisé par", site: "Site web" },
  pt: { tag: "Patrocinado por", site: "Site" },
};

const RANA_URL = "https://ranawalk.com/";
const LOGO = "https://ranawalk.com/images/logos%20rana/Logo-Rana-Walk-full-color_vertical.png";

export default function RanaSponsor({ lang }) {
  const t = T[lang] || T.es;
  return (
    <div className="rana">
      <div className="rana-bar">
        <span className="rana-tag">
          <span className="rana-spk">{t.tag}</span>
          <a href={RANA_URL} target="_blank" rel="noopener noreferrer" aria-label="RanaWalk">
            <img className="rana-logo-img" src={LOGO} alt="RanaWalk" />
          </a>
        </span>
        <a className="rana-link" href={RANA_URL} target="_blank" rel="noopener noreferrer">
          {t.site} →
        </a>
      </div>
    </div>
  );
}
