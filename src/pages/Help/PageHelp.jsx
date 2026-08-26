import { useMemo, useState } from "react";
import { Icons } from "../../icons/Icons";

const PLAYBOOKS = [
  {
    id: "automation-error",
    iconKey: "Zap",
    title: "Automação com erro",
    subtitle: "Roteiro rápido para entender se é falha pontual, credencial ou dado de entrada.",
    steps: [
      "Abra Clientes e acesse o cliente afetado.",
      "Entre na automação e filtre execuções por erro.",
      "Compare a última execução com uma execução bem-sucedida.",
      "Verifique se o erro vem de credencial, payload incompleto, timeout ou regra de negócio.",
      "Se repetir mais de uma vez, abra ticket com print/log e horário da falha.",
    ],
  },
  {
    id: "new-client",
    iconKey: "Users",
    title: "Cliente sem dados",
    subtitle: "Quando o cliente aparece vazio ou sem integrações vinculadas.",
    steps: [
      "Confirme se o cliente foi criado na base correta.",
      "Verifique se automações n8n e bots Typebot usam o mesmo identificador do cliente.",
      "Use a busca de Clientes para validar nome, status e integrações encontradas.",
      "Se os dados existem fora do sistema, rode a sincronização existente ou acione suporte.",
    ],
  },
  {
    id: "document-flow",
    iconKey: "Doc",
    title: "Documentos e PDFs",
    subtitle: "Uso correto da base de conhecimento e captura de arquivos.",
    steps: [
      "Acesse Documentos para criar ou importar materiais internos.",
      "Use títulos objetivos: Cliente · Processo · Ferramenta · Versão.",
      "Marque documentos com tags úteis para busca futura.",
      "Ao importar PDF, confira se o conteúdo extraído ficou legível antes de salvar.",
    ],
  },
];

const FAQS = [
  {
    category: "Automações",
    q: "Como vincular uma automação do n8n a um cliente?",
    a: "Acesse Clientes, abra o cliente correto e valide se a automação está associada pelo identificador externo. Se ela não aparecer, confirme se o sync foi executado e se o workflow tem metadados suficientes para associação.",
  },
  {
    category: "Automações",
    q: "Como investigar uma execução com erro?",
    a: "Abra o detalhe do cliente, clique na automação, filtre por Erro e veja as execuções mais recentes. Comece pela mensagem de erro, horário e payload. Depois compare com uma execução bem-sucedida.",
  },
  {
    category: "Clientes",
    q: "Por que a aba Clientes pode aparecer vazia?",
    a: "Normalmente é API desligada, banco errado no .env ou falta de dados sincronizados. Primeiro confira o indicador de API no topo, depois valide se o backend está rodando e se o banco configurado é o esperado.",
  },
  {
    category: "Acesso",
    q: "Como configurar login do Google para novos usuários?",
    a: "Cadastre o usuário com o e-mail oficial e mantenha o domínio autorizado nas configurações. No primeiro acesso, o usuário poderá entrar pelo Google se o backend e as credenciais estiverem configurados.",
  },
  {
    category: "WhatsApp",
    q: "O que fazer se uma instância v4chat apresentar erro?",
    a: "Abra o cliente, confira a instância, identificador e status. Se necessário, revalide a conexão e registre o horário do erro no ticket para facilitar diagnóstico técnico.",
  },
  {
    category: "Documentos",
    q: "Quando devo criar documento interno?",
    a: "Sempre que uma solução, procedimento ou ajuste puder ser reutilizado. Documente processo, contexto, passos, prints relevantes e responsáveis. Isso reduz retrabalho do time.",
  },
];

const TTT_CATEGORIES = [
  { value: "client_idea", label: "Ideia (Clientes/Unidade)", iconKey: "Lightbulb" },
  { value: "question", label: "Dúvida", iconKey: "HelpCircle" },
  { value: "improvement", label: "Melhoria", iconKey: "Sparkles" },
  { value: "solution_opportunity", label: "Solução / Oportunidade", iconKey: "Rocket" },
  { value: "other", label: "Outro", iconKey: "Pin" },
];

const TTT_TEMPLATES = {
  client_idea: "Ideia para qual cliente/unidade:\n\nComo essa ideia ajuda:\n\nPróximos passos sugeridos:\n",
  question: "Qual sua dúvida técnica ou de processo:\n\nContexto da dúvida:\n",
  improvement: "O que podemos melhorar:\n\nOnde essa melhoria se aplica:\n\nBenefício esperado:\n",
  solution_opportunity: "Qual é a solução ou oportunidade identificada:\n\nComo podemos implementar:\n\nImpacto nos projetos:\n",
  other: "Sua contribuição:\n\nDetalhes:\n",
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function PageHelp({ setPage, session }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [faqSearch, setFaqSearch] = useState("");
  const [selectedPlaybook, setSelectedPlaybook] = useState(PLAYBOOKS[0].id);
  const [formMessage, setFormMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tttForm, setTttForm] = useState({
    title: "",
    category: "client_idea",
    description: TTT_TEMPLATES.client_idea,
  });

  useEffect(() => {
    const handleResetPage = (event) => {
      if (event.detail === "help") {
        setOpenFaq(0);
        setFaqSearch("");
        setSelectedPlaybook(PLAYBOOKS[0].id);
        setFormMessage(null);
      }
    };
    window.addEventListener("app:reset-page", handleResetPage);
    return () => window.removeEventListener("app:reset-page", handleResetPage);
  }, []);

  const selectedGuide = useMemo(
    () => PLAYBOOKS.find((item) => item.id === selectedPlaybook) || PLAYBOOKS[0],
    [selectedPlaybook]
  );

  const filteredFaqs = useMemo(() => {
    const term = normalize(faqSearch);
    if (!term) return FAQS;
    return FAQS.filter((faq) => normalize(`${faq.category} ${faq.q} ${faq.a}`).includes(term));
  }, [faqSearch]);

  const updateTttCategory = (category) => {
    setTttForm((current) => ({
      ...current,
      category,
      description: current.description && current.description !== TTT_TEMPLATES[current.category]
        ? current.description
        : TTT_TEMPLATES[category],
    }));
  };

  const handleTttSubmit = async (event) => {
    event.preventDefault();
    setFormMessage(null);

    if (!tttForm.title.trim()) {
      setFormMessage({ type: "error", text: "Digite o título ou tema do post." });
      return;
    }
    if (!tttForm.description.trim()) {
      setFormMessage({ type: "error", text: "Digite uma descrição ou resumo do post." });
      return;
    }

    setSubmitting(true);
    try {
      const categoryLabel = TTT_CATEGORIES.find(c => c.value === tttForm.category)?.label || tttForm.category;
      const response = await fetch("https://n8.v4saman.com/webhook/saman-and-co-techops-ttt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: tttForm.title.trim(),
          category: categoryLabel,
          description: tttForm.description.trim(),
          suggestedBy: {
            name: session?.user?.name || "Usuário",
            email: session?.user?.email || "",
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar a sugestão.");
      }

      setFormMessage({ type: "success", text: "Sugestão enviada com sucesso para o TTT!" });
      setTttForm({ title: "", category: "client_idea", description: TTT_TEMPLATES.client_idea });
    } catch (error) {
      setFormMessage({ type: "error", text: error.message || "Não foi possível enviar a sugestão agora." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="help-page">
      <section className="help-hero">
        <div className="help-hero__content">
          <div className="dashboard-hero__eyebrow">Central interna</div>
          <h1 className="help-hero__title">Ajuda operacional sem popup, sem distração.</h1>
          <p className="help-hero__subtitle">
            Guia rápido para consultar procedimentos, sugerir novos conteúdos para o TTT ou abrir chamados de suporte técnico.
          </p>
          <div className="help-hero__actions">
            <a href="https://app.ekyte.com/" target="_blank" rel="noopener noreferrer" className="btn btn--primary">
              🚀 Abrir chamado
            </a>
            <button type="button" className="btn btn--outline" onClick={() => setPage("docs")}>
              📖 Ir para documentos
            </button>
          </div>
        </div>
      </section>

      <div className="help-layout">
        <section className="help-column help-column--main">
          <div className="help-panel">
            <div className="section-header section-header--tight">
              <div>
                <div className="section-header__eyebrow">Playbooks</div>
                <h2>O que fazer primeiro?</h2>
                <p>Roteiros curtos para reduzir tentativa e erro quando algo quebrar.</p>
              </div>
            </div>

            <div className="playbook-tabs" role="tablist" aria-label="Playbooks de suporte">
              {PLAYBOOKS.map((item) => {
                const IconComponent = Icons[item.iconKey];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`playbook-tab ${selectedPlaybook === item.id ? "playbook-tab--active" : ""}`}
                    onClick={() => setSelectedPlaybook(item.id)}
                  >
                    <span className="playbook-tab__icon">
                      {IconComponent ? <IconComponent /> : null}
                    </span>
                    <strong>{item.title}</strong>
                  </button>
                );
              })}
            </div>

            <article className="playbook-detail">
              <div className="playbook-detail__icon">
                {(() => {
                  const IconComponent = Icons[selectedGuide.iconKey];
                  return IconComponent ? <IconComponent /> : null;
                })()}
              </div>
              <div className="playbook-detail__body">
                <h3>{selectedGuide.title}</h3>
                <p>{selectedGuide.subtitle}</p>
                <ol>
                  {selectedGuide.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            </article>
          </div>

          <div className="help-panel">
            <div className="section-header section-header--tight section-header--splitline">
              <div>
                <div className="section-header__eyebrow">FAQ</div>
                <h2>Respostas rápidas</h2>
                <p>Procure pelo problema antes de abrir chamado. Isso economiza tempo do time.</p>
              </div>
              <div className="search-wrap help-faq-search">
                <span className="si">
                  <Icons.Search />
                </span>
                <input
                  className="search-input"
                  value={faqSearch}
                  onChange={(event) => setFaqSearch(event.target.value)}
                  placeholder="Buscar no FAQ..."
                />
              </div>
            </div>

            <div className="faq-list">
              {filteredFaqs.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <div className="empty-state__icon">
                    <Icons.Search />
                  </div>
                  <div className="empty-state__title">Nada encontrado</div>
                  <div className="empty-state__description">Tente outro termo ou procure na documentação.</div>
                </div>
              ) : filteredFaqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={`${faq.category}-${faq.q}`} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}>
                    <button type="button" onClick={() => setOpenFaq(isOpen ? null : index)}>
                      <span className="faq-item__category">{faq.category}</span>
                      <strong>{faq.q}</strong>
                      <span className="faq-item__chevron">
                        <Icons.ChevronDown />
                      </span>
                    </button>
                    {isOpen && <p>{faq.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="help-column help-column--side">
          <form id="ttt-form" className="help-ticket-card" onSubmit={handleTttSubmit}>
            <div className="section-header section-header--tight">
              <div>
                <div className="section-header__eyebrow">TTT — Tech Talk Time</div>
                <h2>Compartilhar ideia ou solução</h2>
                <p style={{ fontSize: "12.5px", lineHeight: "1.45", marginTop: "4px" }}>
                  Um espaço colaborativo para compartilhar ideias para clientes/unidades, dúvidas, melhorias, soluções e oportunidades que possam ajudar no nosso trabalho e nos projetos da empresa.
                </p>
              </div>
            </div>

            {formMessage && (
              <div className={`help-message help-message--${formMessage.type}`}>
                {formMessage.text}
              </div>
            )}

            <div className="help-field">
              <label>Categoria *</label>
              <div className="help-type-grid">
                {TTT_CATEGORIES.map((type) => {
                  const IconComponent = Icons[type.iconKey];
                  return (
                    <button
                      key={type.value}
                      type="button"
                      className={`help-choice ${tttForm.category === type.value ? "help-choice--active" : ""}`}
                      onClick={() => updateTttCategory(type.value)}
                    >
                      <span>
                        {IconComponent ? <IconComponent /> : null}
                      </span>
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="help-field">
              <label>Tema / Título *</label>
              <input
                type="text"
                value={tttForm.title}
                onChange={(event) => setTttForm({ ...tttForm, title: event.target.value })}
                placeholder="Ex: Sugestão de IA para a Unidade X"
                required
              />
            </div>

            <div className="help-field">
              <div className="help-field__header">
                <label>Descrição *</label>
                <button type="button" onClick={() => setTttForm({ ...tttForm, description: TTT_TEMPLATES[tttForm.category] })}>
                  Usar template
                </button>
              </div>
              <textarea
                value={tttForm.description}
                onChange={(event) => setTttForm({ ...tttForm, description: event.target.value })}
                placeholder="Descreva a sua ideia, melhoria, dúvida ou solução..."
                required
              />
            </div>

            <button type="submit" className="btn btn--primary help-submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar post para o TTT"}
            </button>
          </form>

          <div className="help-panel help-panel--compact">
            <div className="section-header section-header--tight">
              <div>
                <div className="section-header__eyebrow">Checklist</div>
                <h2>Antes de enviar</h2>
              </div>
            </div>
            <ul className="support-checklist">
              <li>O post ajuda o time ou os projetos da empresa.</li>
              <li>A descrição explica claramente a sua ideia.</li>
              <li>Selecione a categoria mais adequada para o seu post.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
