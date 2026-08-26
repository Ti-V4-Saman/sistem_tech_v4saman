import { getGreeting, formatShortName } from "../../utils/formatters";
import { Icons } from "../../icons/Icons";

/**
 * @module PageHome
 * @description Página inicial com banner de boas-vindas e ações rápidas.
 */
export default function PageHome({ session, setPage }) {
  const rawName = session?.user?.name || "Colaborador";
  const displayName = formatShortName(rawName);
  const isSuperAdmin = session?.user?.accessRoleSlug === "super-admin";

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
                onClick={() => setPage("help")}
              >
                <Icons.HelpCircle /> Precisa de ajuda?
              </button>
            </div>
            
            {isSuperAdmin && (
              <button
                className="btn btn--outline home-btn-admin"
                onClick={() => setPage("settings")}
              >
                <Icons.Settings /> Área Administrativa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer text */}
      <div className="home-footer">
        <span>TechOps Saman & Co. — Central de Operações</span>
      </div>
    </div>
  );
}
