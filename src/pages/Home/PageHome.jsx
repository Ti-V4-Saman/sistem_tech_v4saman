import { getGreeting, formatShortName } from "../../utils/formatters";
import { Icons } from "../../icons/Icons";
import { AboutSection } from "../../components/about/AboutSection";

/**
 * @module PageHome
 * @description Página inicial com banner de boas-vindas, ações rápidas e área Sobre Nós.
 */
export default function PageHome({ session, setPage }) {
  const rawName = session?.user?.name || "Colaborador";
  const displayName = formatShortName(rawName);
  const isSuperAdmin = session?.user?.accessRoleSlug === "super-admin";

  const handleScrollToAbout = () => {
    const elem = document.getElementById("sobre-nos");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    } else if (setPage) {
      setPage("about");
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        {/* Character image on the left */}
        <div className="home-card__left">
          <img
            src="/rob-saman.png"
            alt="Rob Saman"
            className="home-card__image"
          />
        </div>

        {/* Content on the right */}
        <div className="home-card__right">
          <span className="home-card__greeting">
            {getGreeting()}, {displayName}!
          </span>
          <h1 className="home-card__title">
            Bem-vindo ao<br />
            <span>TechOps Saman</span>
          </h1>
          <p className="home-card__description">
            Estou aqui para ajudar você a navegar pelo sistema. Consulte a Base
            de Conhecimento para encontrar documentação, tutoriais e respostas
            para suas dúvidas.
          </p>

          <div className="home-buttons-grid">
            <div className="home-buttons-row">
              <button
                className="btn btn--primary"
                onClick={() => setPage("docs")}
              >
                <Icons.Doc /> Base de Conhecimento
              </button>
              <button
                className="btn btn--outline"
                onClick={handleScrollToAbout}
              >
                <Icons.Sparkles /> Sobre Nós & Cultura
              </button>
            </div>
            
            {isSuperAdmin && (
              <button
                className="btn btn--outline home-btn-admin"
                onClick={() => setPage("settings")}
              >
                <Icons.Settings /> Área Administrativa <span style={{ display: "inline-flex", alignItems: "center", marginLeft: "4px", opacity: 0.8 }} title="Acesso restrito para Administrador"><Icons.Lock /></span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Sobre Nós Section */}
      <AboutSection setPage={setPage} />

      {/* Footer text */}
      <div className="home-footer">
        <span>TechOps Saman & Co. — Central de Operações</span>
      </div>
    </div>
  );
}
