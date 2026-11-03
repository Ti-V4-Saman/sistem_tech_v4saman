import { getGreeting, formatShortName } from "../../utils/formatters";
import { Icons } from "../../icons/Icons";
import { BrandMark } from "../../components/app/BrandMark";

/**
 * @module PageHome
 * @description Página inicial com banner de boas-vindas e ações rápidas.
 */
export default function PageHome({ session, setPage }) {
  const rawName = session?.user?.name || "Colaborador";
  const displayName = formatShortName(rawName);
  const role = session?.user?.accessRoleSlug;
  const isAdmin = role === "admin" || role === "super-admin";

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-card__left" aria-hidden="true">
          <div className="home-visual">
            <div className="home-visual__glow" />
            <div className="home-visual__core"><BrandMark className="home-visual__brand" /></div>
            <span className="home-visual__label">V4 Company</span>
            <div className="home-visual__chip home-visual__chip--one"><Icons.Users /><span>Clientes</span></div>
            <div className="home-visual__chip home-visual__chip--two"><Icons.Zap /><span>Automações</span></div>
            <div className="home-visual__chip home-visual__chip--three"><Icons.Doc /><span>Conhecimento</span></div>
          </div>
        </div>

        {/* Content on the right */}
        <div className="home-card__right">
          <span className="home-card__eyebrow"><i /> TechOps · V4 Company</span>
          <span className="home-card__greeting">
            {getGreeting()}, {displayName}!
          </span>
          <h1 className="home-card__title">
            Sua operação,<br />
            <span>no controle.</span>
          </h1>
          <p className="home-card__description">
            Encontre o que precisa e acompanhe sua rotina em uma única central.
          </p>

          <div className="home-actions">
            <div className="home-actions__heading"><strong>Acessos rápidos</strong><span>Comece por onde fizer mais sentido</span></div>
            <div className="home-actions__grid">
              <button type="button" className="home-action home-action--primary" onClick={() => setPage("dashboard")}>
                <span className="home-action__icon"><Icons.ChartBar /></span>
                <span><strong>Ver operação</strong><small>Indicadores e alertas</small></span>
                <Icons.ChevronRight />
              </button>
              <button type="button" className="home-action" onClick={() => setPage("clients")}>
                <span className="home-action__icon"><Icons.Users /></span>
                <span><strong>Clientes</strong><small>Contas e integrações</small></span>
                <Icons.ChevronRight />
              </button>
              <button type="button" className="home-action" onClick={() => setPage("docs")}>
                <span className="home-action__icon"><Icons.Doc /></span>
                <span><strong>Documentos</strong><small>Guias e processos</small></span>
                <Icons.ChevronRight />
              </button>
              {isAdmin && <button type="button" className="home-action" onClick={() => setPage("flows")}>
                <span className="home-action__icon"><Icons.Zap /></span>
                <span><strong>Modelos de fluxos</strong><small>Automações guiadas</small></span>
                <Icons.ChevronRight />
              </button>}
            </div>
          </div>
        </div>
      </div>

      <div className="home-footer">
        <span><strong>TechOps</strong> · Central de Operações</span>
        <span>V4 Company</span>
      </div>
    </div>
  );
}
