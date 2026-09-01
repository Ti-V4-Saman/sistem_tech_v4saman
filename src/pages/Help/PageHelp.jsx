import { Icons } from "../../icons/Icons";

export default function PageHelp({ setPage, session }) {
  const isAdmin = session?.user?.accessRoleSlug === "admin" || session?.user?.accessRoleSlug === "super-admin";

  return (
    <div className="help-page">
      <section className="help-hero">
        <div className="help-hero__content">
          <div className="dashboard-hero__eyebrow">Manual do Sistema</div>
          <h1 className="help-hero__title">Como o TechOps Saman funciona</h1>
          <p className="help-hero__subtitle">
            Guia rápido para entender as principais funcionalidades do sistema e como navegar pelas telas.
          </p>
          <div className="help-hero__actions">
            <button type="button" className="btn btn--primary" onClick={() => setPage("docs")}>
              📖 Ir para Base de Conhecimento
            </button>
          </div>
        </div>
      </section>

      <div className="help-layout">
        <section className="help-column help-column--main" style={{ flex: "1 1 100%" }}>
          <div className="help-panel">
            <div className="section-header section-header--tight">
              <div>
                <div className="section-header__eyebrow">Visão Geral</div>
                <h2>Conceitos Básicos</h2>
              </div>
            </div>
            
            <article className="playbook-detail" style={{ border: "none", padding: "16px 0 0 0" }}>
              <div className="playbook-detail__body" style={{ margin: 0 }}>
                <h3>Clientes e Integrações</h3>
                <p>
                  O módulo de Clientes centraliza o acesso às informações e integrações de cada cliente (ou unidade de negócio).
                </p>
                <ul>
                  <li><strong>Automações (n8n):</strong> Lista os fluxos ativos e inativos, além de permitir o monitoramento das execuções e de seus eventuais erros (sucesso, erro, timeout).</li>
                  <li><strong>Bots (Typebot):</strong> Gerencia os fluxos de chat, exibindo o status de publicação e acesso rápido aos construtores visuais (builder) e aos links diretos.</li>
                  <li><strong>v4chat:</strong> Exibe as instâncias conectadas para envios e atendimentos de WhatsApp, incluindo status de conexão e número.</li>
                  <li><strong>Acessos / Credenciais:</strong> Um cofre seguro para links, senhas, tokens de API e informações cruciais para a operação do cliente.</li>
                </ul>

                <h3 style={{ marginTop: "24px" }}>Base de Conhecimento (Documentos)</h3>
                <p>
                  A Base de Conhecimento é onde a equipe centraliza os Playbooks, Guias Técnicos e Procedimentos Operacionais Padrão (POPs).
                </p>
                <ul>
                  <li>Ao criar um documento, ele inicia como <strong>Rascunho</strong>, visível apenas para você e administradores.</li>
                  <li>Quando <strong>Publicado</strong>, o documento segue regras de visibilidade:</li>
                  <li>Se tiver a tag "Todos", ou se não possuir nenhuma tag, ele fica visível para todos da equipe.</li>
                  <li>Se possuir tags específicas (ex: "Atendimento", "Squad Alpha"), apenas membros pertencentes àquela função ou squad poderão acessá-lo.</li>
                </ul>
              </div>
            </article>
          </div>

          {isAdmin && (
            <div className="help-panel" style={{ marginTop: "24px" }}>
              <div className="section-header section-header--tight" style={{ borderBottom: "1px solid var(--danger)", paddingBottom: "12px" }}>
                <div>
                  <div className="section-header__eyebrow" style={{ color: "var(--danger)" }}>Área Administrativa</div>
                  <h2>Ações e Relatórios</h2>
                </div>
              </div>
              
              <article className="playbook-detail" style={{ border: "none", padding: "16px 0 0 0" }}>
                <div className="playbook-detail__body" style={{ margin: 0 }}>
                  <h3>Gestão de Usuários e Permissões</h3>
                  <p>
                    Administradores têm acesso ao painel de configurações gerais (via menu lateral ou botão na página inicial).
                  </p>
                  <ul>
                    <li>Você pode <strong>criar novos usuários</strong>, atribuir um Perfil de Acesso (Comum, Admin), Função (Job Role) e Squad.</li>
                    <li>As configurações de <strong>Função e Squad</strong> no perfil de cada usuário ditam quais documentos ele consegue enxergar na Base de Conhecimento. Mantenha isso sempre atualizado.</li>
                    <li>O controle de visibilidade das credenciais nos Clientes também pode ser ajustado na aba de configurações do sistema.</li>
                  </ul>
                  
                  <h3 style={{ marginTop: "24px" }}>Criação de Clientes</h3>
                  <p>
                    Apenas administradores podem criar novos clientes no banco de dados. Os colaboradores comuns só podem visualizar clientes e suas métricas ou credenciais caso estejam devidamente preenchidos.
                  </p>
                </div>
              </article>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
