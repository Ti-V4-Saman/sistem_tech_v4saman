import { useState } from "react";
import { api } from "../../services/api";
import { Icons } from "../../icons/Icons";

const SQUADS = ["BRIU", "SEALS", "BRAVO", "SNIPERS", "BALBOA"];
const WHATS_SUFFIX = "@g.us";
const PACKAGES = [
  { id: "basic", label: "Só cadastrar o cliente", description: "Nenhuma automação por enquanto", Icon: Icons.Building },
  { id: "meta-sheets", label: "Guardar leads da Meta", description: "Salvar os contatos em uma planilha", Icon: Icons.Target },
  { id: "google-sheets", label: "Guardar dados do Google Ads", description: "Salvar os resultados em uma planilha", Icon: Icons.ChartBar },
  { id: "performance", label: "Juntar Meta e Google Ads", description: "Organizar tudo na mesma estrutura", Icon: Icons.TrendingUp },
  { id: "complete", label: "Preparar tudo", description: "Planilhas e avisos para a equipe", Icon: Icons.Sparkles, featured: true },
  { id: "movement", label: "Mover ou distribuir leads", description: "Enviar contatos para o próximo destino", Icon: Icons.Grid },
];

const STEP_LABELS = ["Cliente", "Objetivo", "Confirmar"];

function createInitialState(defaultResponsible) {
  return {
    responsavel: defaultResponsible || "", squad: "", cliente: "", flowPackage: "",
    bm: "", webhook: "", webhookManual: false, fluxoMeta: false, metaSheet: "",
    fluxoGoogle: false, googleSheet: "", grupoInterno: false, internoChat: "",
    grupoCliente: false, clienteWhatsappBase: "", movimentacaoLeads: false,
    leadSource: "crmv4", leadDestination: "distribution",
  };
}

export function ClientFlowForm({ defaultResponsible = "", onOpenGuide }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => createInitialState(defaultResponsible));
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [identityErrors, setIdentityErrors] = useState([]);
  const [detailErrors, setDetailErrors] = useState([]);
  const [completedClient, setCompletedClient] = useState("");
  const selectedPackage = PACKAGES.find(item => item.id === formData.flowPackage);

  const update = changes => {
    setFormData(current => ({ ...current, ...changes }));
    setStatusMessage(null);
    setIdentityErrors(current => current.filter(field => !(field in changes)));
    setDetailErrors(current => current.filter(field => !(field in changes)));
  };

  const choosePackage = flowPackage => {
    const presets = {
      basic: { fluxoMeta: false, fluxoGoogle: false, grupoInterno: false, grupoCliente: false, movimentacaoLeads: false },
      "meta-sheets": { fluxoMeta: true, fluxoGoogle: false, grupoInterno: false, grupoCliente: false, movimentacaoLeads: false },
      "google-sheets": { fluxoMeta: false, fluxoGoogle: true, grupoInterno: false, grupoCliente: false, movimentacaoLeads: false },
      performance: { fluxoMeta: true, fluxoGoogle: true, grupoInterno: false, grupoCliente: false, movimentacaoLeads: false },
      complete: { fluxoMeta: true, fluxoGoogle: true, grupoInterno: true, grupoCliente: true, movimentacaoLeads: false },
      movement: { fluxoMeta: false, fluxoGoogle: false, grupoInterno: false, grupoCliente: false, movimentacaoLeads: true },
    };
    update({ flowPackage, ...presets[flowPackage] });
  };

  const continueFromIdentity = () => {
    const missing = [
      !formData.responsavel.trim() && "responsavel",
      !formData.squad && "squad",
      !formData.cliente.trim() && "cliente",
    ].filter(Boolean);
    if (missing.length) {
      setIdentityErrors(missing);
      setStatusMessage({ type: "error", text: "Complete os campos marcados para continuar." });
      return;
    }
    setIdentityErrors([]);
    setStatusMessage(null);
    setStep(2);
  };

  const handleClienteChange = event => {
    const cliente = event.target.value;
    const slug = cliente.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setFormData(current => ({ ...current, cliente, webhook: current.webhookManual ? current.webhook : slug ? `${slug}-google-ads` : "" }));
    setStatusMessage(null);
    setIdentityErrors(current => current.filter(field => field !== "cliente"));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setStatusMessage(null);
    const errors = [
      formData.bm && formData.bm.length < 10 && "bm",
      formData.fluxoMeta && !formData.metaSheet.trim().startsWith("https://docs.google.com/spreadsheets/") && "metaSheet",
      formData.fluxoGoogle && !formData.googleSheet.trim().startsWith("https://docs.google.com/spreadsheets/") && "googleSheet",
    ].filter(Boolean);
    if (errors.length) {
      setDetailErrors(errors);
      setStatusMessage({ type: "error", text: "Revise os campos marcados antes de criar." });
      return;
    }
    setDetailErrors([]);

    const payload = {
      flowPackage: formData.flowPackage, responsavel: formData.responsavel.trim(), squad: formData.squad,
      cliente: formData.cliente.trim(), bm: formData.bm || null, webhook: formData.webhook.trim() || null,
      fluxoMeta: formData.fluxoMeta, metaSheet: formData.fluxoMeta ? formData.metaSheet.trim() : null,
      fluxoGoogle: formData.fluxoGoogle, googleSheet: formData.fluxoGoogle ? formData.googleSheet.trim() : null,
      grupoInterno: formData.grupoInterno, internoChat: formData.grupoInterno ? formData.internoChat.trim() : null,
      grupoCliente: formData.grupoCliente,
      clienteWhatsapp: formData.grupoCliente && formData.clienteWhatsappBase.trim() ? `${formData.clienteWhatsappBase.trim()}${WHATS_SUFFIX}` : null,
      movimentacaoLeads: formData.movimentacaoLeads,
      leadSource: formData.movimentacaoLeads ? formData.leadSource : null,
      leadDestination: formData.movimentacaoLeads ? formData.leadDestination : null,
    };

    setLoading(true);
    try {
      let success = false;
      try {
        const response = await fetch("https://n8ops.v4saman.com/webhook/v4saman-criador-de-fluxos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        success = response.ok;
      } catch (error) { console.warn("Disparo direto indisponível; usando proxy.", error); }
      if (!success) await api.sendClientFlowWebhook(payload);
      setCompletedClient(formData.cliente.trim());
      setStatusMessage(null);
      setFormData(createInitialState(defaultResponsible));
      setStep(1);
    } catch (error) {
      setStatusMessage({ type: "error", text: error.message || "Não foi possível cadastrar o cliente." });
    } finally { setLoading(false); }
  };

  const startAgain = () => {
    setCompletedClient("");
    setStatusMessage(null);
    setIdentityErrors([]);
    setDetailErrors([]);
    setFormData(createInitialState(defaultResponsible));
    setStep(1);
  };

  if (completedClient) {
    return (
      <section className="client-wizard client-wizard--success">
        <div className="client-success__icon"><Icons.CheckCircle /></div>
        <span>Pronto!</span>
        <h2>{completedClient} foi cadastrado</h2>
        <p>A solicitação foi enviada e a configuração já pode ser iniciada.</p>
        <button type="button" className="btn btn--primary" onClick={startAgain}><Icons.Plus /> Cadastrar outro cliente</button>
      </section>
    );
  }

  return (
    <section className="client-wizard">
      <div className="client-wizard__progress">
        <ol>{STEP_LABELS.map((label, index) => { const number = index + 1; return <li key={label} className={number === step ? "is-current" : number < step ? "is-complete" : ""}><span>{number < step ? "✓" : number}</span><small>{label}</small></li>; })}</ol>
        <button type="button" className="flow-help-button" onClick={onOpenGuide} aria-label="Abrir ajuda"><Icons.HelpCircle /><span>Ajuda</span></button>
      </div>
      {statusMessage && <div className={`client-wizard__message is-${statusMessage.type}`}>{statusMessage.type === "success" ? <Icons.CheckCircle /> : <Icons.AlertTriangle />}<span>{statusMessage.text}</span></div>}

      {step === 1 && (
        <div className="client-wizard__step">
          <StepTitle eyebrow="Passo 1 de 3" title="Quem é o cliente?" subtitle="Preencha os três campos abaixo." />
          <div className="client-wizard__fields">
            <label className={identityErrors.includes("responsavel") ? "has-error" : ""}><span>Quem será o responsável?</span><input autoFocus value={formData.responsavel} onChange={event => update({ responsavel: event.target.value })} placeholder="Digite o nome" aria-invalid={identityErrors.includes("responsavel")} /></label>
            <div className="g2"><label className={identityErrors.includes("squad") ? "has-error" : ""}><span>Qual é o squad?</span><select value={formData.squad} onChange={event => update({ squad: event.target.value })} aria-invalid={identityErrors.includes("squad")}><option value="">Selecione</option>{SQUADS.map(squad => <option key={squad}>{squad}</option>)}</select></label><label className={identityErrors.includes("cliente") ? "has-error" : ""}><span>Nome do cliente</span><input value={formData.cliente} onChange={handleClienteChange} placeholder="Ex.: Empresa Silva" aria-invalid={identityErrors.includes("cliente")} /></label></div>
          </div>
          <div className="client-wizard__footer"><span /><button type="button" className="btn btn--primary flow-primary-action" onClick={continueFromIdentity}>Continuar <Icons.ChevronRight /></button></div>
        </div>
      )}

      {step === 2 && (
        <div className="client-wizard__step">
          <StepTitle eyebrow="Passo 2 de 3" title="O que você quer deixar pronto?" subtitle="Escolha uma opção." />
          <div className="simple-choice-grid">{PACKAGES.map(option => { const PackageIcon = option.Icon; const selected = formData.flowPackage === option.id; return <button type="button" key={option.id} className={`simple-choice ${selected ? "is-selected" : ""}`} onClick={() => choosePackage(option.id)} aria-pressed={selected}><span><PackageIcon /></span><div>{option.featured && <em>Mais completo</em>}<strong>{option.label}</strong><small>{option.description}</small></div><i>{selected ? <Icons.CheckCircle /> : <Icons.ChevronRight />}</i></button>; })}</div>
          <div className="client-wizard__footer"><button type="button" className="btn btn--ghost" onClick={() => setStep(1)}><Icons.ArrowLeft /> Voltar</button><button type="button" className="btn btn--primary flow-primary-action" disabled={!selectedPackage} onClick={() => setStep(3)}>Continuar <Icons.ChevronRight /></button></div>
        </div>
      )}

      {step === 3 && (
        <form className="client-wizard__step" onSubmit={handleSubmit}>
          <StepTitle eyebrow="Passo 3 de 3" title="Confira e confirme" subtitle="Só falta preencher o que estiver abaixo." />
          <div className="client-wizard__fields">
            {formData.fluxoMeta && <label className={detailErrors.includes("metaSheet") ? "has-error" : ""}><span>Onde salvar os leads da Meta?</span><input autoFocus type="url" value={formData.metaSheet} onChange={event => update({ metaSheet: event.target.value })} placeholder="Cole aqui o link da planilha" aria-invalid={detailErrors.includes("metaSheet")} />{detailErrors.includes("metaSheet") && <small className="flow-field-error">Cole um link válido do Google Sheets.</small>}</label>}
            {formData.fluxoGoogle && <label className={detailErrors.includes("googleSheet") ? "has-error" : ""}><span>Onde salvar os dados do Google Ads?</span><input autoFocus={!formData.fluxoMeta} type="url" value={formData.googleSheet} onChange={event => update({ googleSheet: event.target.value })} placeholder="Cole aqui o link da planilha" aria-invalid={detailErrors.includes("googleSheet")} />{detailErrors.includes("googleSheet") && <small className="flow-field-error">Cole um link válido do Google Sheets.</small>}</label>}
            {formData.grupoInterno && <label><span>Chat da equipe</span><input value={formData.internoChat} onChange={event => update({ internoChat: event.target.value })} placeholder="Link ou ID do Google Chat" /></label>}
            {formData.grupoCliente && <label><span>Grupo do cliente</span><div className="client-wizard__suffix"><input value={formData.clienteWhatsappBase} onChange={event => update({ clienteWhatsappBase: event.target.value.replace(/@g\.us$/i, "").trim() })} placeholder="ID do grupo" /><b>@g.us</b></div></label>}
            {formData.movimentacaoLeads && <div className="g2"><label><span>De onde vêm?</span><select value={formData.leadSource} onChange={event => update({ leadSource: event.target.value })}><option value="crmv4">CRM V4</option><option value="rd-station">RD Station</option><option value="sheets">Google Sheets</option><option value="v4chat">V4Chat</option></select></label><label><span>O que fazer?</span><select value={formData.leadDestination} onChange={event => update({ leadDestination: event.target.value })}><option value="distribution">Distribuir entre vendedores</option><option value="sheets">Salvar em planilha</option><option value="crmv4">Enviar ao CRM V4</option><option value="capi">Avisar a Meta</option><option value="notification">Avisar a equipe</option></select></label></div>}
            {!formData.fluxoMeta && !formData.fluxoGoogle && !formData.grupoInterno && !formData.grupoCliente && !formData.movimentacaoLeads && <div className="client-wizard__ready"><Icons.CheckCircle /><div><strong>Tudo pronto</strong><small>O cliente será cadastrado sem automações adicionais.</small></div></div>}
            <details className="client-wizard__advanced" open={detailErrors.includes("bm") || undefined}><summary><Icons.Settings /> Configurações técnicas <small>Opcional</small></summary><div className="g2"><label className={detailErrors.includes("bm") ? "has-error" : ""}><span>ID da BM</span><input inputMode="numeric" value={formData.bm} onChange={event => update({ bm: event.target.value.replace(/\D/g, "") })} placeholder="Deixe vazio se não souber" aria-invalid={detailErrors.includes("bm")} />{detailErrors.includes("bm") && <small className="flow-field-error">Digite pelo menos 10 números.</small>}</label><label><span>Webhook Google Ads</span><input value={formData.webhook} onChange={event => update({ webhook: event.target.value, webhookManual: true })} placeholder="Preenchido automaticamente" /></label></div></details>
          </div>
          <div className="simple-summary simple-summary--confirmation"><span><Icons.CheckCircle /></span><div><small>Você está criando</small><strong>{formData.cliente}</strong><p>{selectedPackage?.label} <b>·</b> Squad {formData.squad}</p></div><button type="button" onClick={() => setStep(2)}>Alterar</button></div>
          <div className="client-wizard__footer"><button type="button" className="btn btn--ghost" onClick={() => setStep(2)}><Icons.ArrowLeft /> Voltar</button><button type="submit" className="btn btn--primary flow-primary-action" disabled={loading}>{loading ? <><span className="flow-button-spinner" /> Enviando...</> : <>Confirmar e criar <Icons.ChevronRight /></>}</button></div>
        </form>
      )}
    </section>
  );
}

function StepTitle({ eyebrow, title, subtitle }) {
  return <div className="client-wizard__title"><span>{eyebrow}</span><h3>{title}</h3><p>{subtitle}</p></div>;
}
