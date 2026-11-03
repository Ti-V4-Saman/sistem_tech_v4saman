import { useMemo, useState } from "react";
import { Icons } from "../../icons/Icons";
import { CreativeRecoveryFlowForm } from "./CreativeRecoveryFlowForm";

const CRM_OPTIONS = [
  ["crmv4", "CRM V4", "Mais usado"], ["bitrix", "Bitrix24", "Popular"],
  ["facilita", "Facilita Vendas", "Popular"], ["rd-station", "RD Station", "Popular"],
  ["kommo", "Kommo", ""], ["pipedrive", "Pipedrive", ""],
  ["syonet", "Syonet", ""], ["moskit", "Moskit", ""], ["other", "Outro", ""],
];

const DESTINATIONS = [
  ["crm", "Sistema da equipe", "Onde os vendedores trabalham", Icons.Briefcase],
  ["sheets", "Planilha", "Organizar no Google Sheets", Icons.Grid],
  ["v4chat", "Central de atendimento", "Receber no V4Chat", Icons.Bot],
  ["whatsapp", "WhatsApp", "Enviar para um grupo ou pessoa", Icons.Phone],
];

const GOALS = {
  meta: [
    ["capture", "Enviar contatos novos", "Levar cada lead para a equipe", Icons.Users],
    ["movement", "Distribuir contatos", "Dividir ou atualizar os leads", Icons.Grid],
    ["campaign-data", "Guardar resultados dos anúncios", "Salvar os números em uma planilha", Icons.ChartBar],
    ["creative-recovery", "Encontrar uma peça do anúncio", "Buscar usando o ID do anúncio", Icons.Search],
  ],
  lp: [
    ["capture", "Enviar contatos novos", "Levar cada lead para a equipe", Icons.Users],
    ["movement", "Distribuir contatos", "Dividir ou atualizar os leads", Icons.Grid],
  ],
};

const MOVEMENTS = [
  ["sync", "Copiar dados", "Manter dois sistemas iguais", Icons.Database],
  ["distribute", "Dividir entre vendedores", "Distribuir os contatos automaticamente", Icons.Users],
  ["stage", "Mudar a etapa da venda", "Atualizar o andamento do contato", Icons.TrendingUp],
  ["backup", "Guardar uma cópia", "Salvar tudo em uma planilha", Icons.Archive],
  ["capi", "Avisar a Meta sobre a venda", "Melhorar a medição dos anúncios", Icons.Target],
  ["notify", "Avisar a equipe", "Enviar uma notificação", Icons.Bell],
];

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function GuidedFlowBuilder({ source, templates = [], loading = false, onUseTemplate, onOpenGuide }) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState(null);
  const [destination, setDestination] = useState("crm");
  const [crm, setCrm] = useState("crmv4");
  const [movement, setMovement] = useState("distribute");
  const [client, setClient] = useState("");
  const [assetName, setAssetName] = useState("");
  const [connectionValue, setConnectionValue] = useState("");
  const isMeta = source === "meta";
  const sourceLabel = isMeta ? "Anúncios da Meta" : "Página do site";
  const selectedGoal = GOALS[source].find(item => item[0] === goal);
  const selectedDestination = DESTINATIONS.find(item => item[0] === destination);
  const selectedCrm = CRM_OPTIONS.find(item => item[0] === crm);
  const selectedMovement = MOVEMENTS.find(item => item[0] === movement);

  const matchingTemplate = useMemo(() => {
    if (!goal) return null;
    const sourceTerms = isMeta ? ["meta", "facebook"] : ["lp", "landing"];
    const destinationTerms = destination === "crm" ? ["crm", crm.replace("-", " ")] : [destination, destination === "sheets" ? "sheets" : "", destination === "v4chat" ? "chatwoot" : ""];
    return templates.find(template => {
      if (!template.is_active) return false;
      const text = normalize(`${template.name} ${template.slug} ${template.category} ${template.description}`);
      return sourceTerms.some(term => text.includes(term)) && destinationTerms.some(term => term && text.includes(normalize(term)));
    }) || null;
  }, [crm, destination, goal, isMeta, templates]);

  const guideTitle = `${sourceLabel}: ${selectedGoal?.[1] || "configuração"}${goal === "capture" ? ` para ${destination === "crm" ? selectedCrm?.[1] : selectedDestination?.[1]}` : ""}`;
  const ready = Boolean(matchingTemplate);

  const chooseGoal = value => {
    setGoal(value);
    if (value === "campaign-data") setDestination("sheets");
    setStep(2);
  };

  const reset = () => {
    setStep(1);
    setGoal(null);
    setConnectionValue("");
  };

  return (
    <section className="simple-wizard">
      <header className="simple-wizard__header">
        <div>
          <span>{sourceLabel}</span>
          <h2>{step === 1 ? "O que precisa acontecer?" : step === 2 ? (goal === "creative-recovery" ? "Qual peça você procura?" : goal === "movement" ? "O que fazer com os contatos?" : "Para onde enviar os contatos?") : "Confira antes de criar"}</h2>
          <p>{step === 1 ? "Escolha o resultado que você espera." : step === 2 ? "Selecione uma opção." : "Preencha os últimos dados."}</p>
        </div>
        <div className="simple-wizard__header-side">
          <span className="simple-wizard__step-label">Passo {step} de 3</span>
          <div className="simple-wizard__progress" aria-label={`Passo ${step} de 3`}>{[1, 2, 3].map(number => <i key={number} className={number <= step ? "is-active" : ""} />)}</div>
          <button type="button" className="flow-help-button" onClick={() => onOpenGuide(guideTitle)} aria-label="Abrir ajuda"><Icons.HelpCircle /><span>Ajuda</span></button>
        </div>
      </header>

      <div className="simple-wizard__body">
        {step === 1 && (
          <div className="simple-choice-grid simple-choice-grid--goals">
            {GOALS[source].map(option => <Choice key={option[0]} option={option} onClick={() => chooseGoal(option[0])} />)}
          </div>
        )}

        {step === 2 && goal === "creative-recovery" && (
          <div className="simple-wizard__embedded"><CreativeRecoveryFlowForm embedded /></div>
        )}

        {step === 2 && goal === "movement" && (
          <>
            <div className="simple-choice-grid">{MOVEMENTS.map(option => <Choice key={option[0]} option={option} selected={movement === option[0]} onClick={() => setMovement(option[0])} />)}</div>
            <WizardFooter onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </>
        )}

        {step === 2 && goal && goal !== "movement" && goal !== "creative-recovery" && (
          <>
            <div className="simple-choice-grid">
              {DESTINATIONS.map(option => <Choice key={option[0]} option={[option[0], option[1], option[2], option[3]]} selected={destination === option[0]} disabled={goal === "campaign-data" && option[0] !== "sheets"} onClick={() => setDestination(option[0])} />)}
            </div>
            {destination === "crm" && goal !== "campaign-data" && (
              <div className="simple-wizard__select"><label>Qual sistema sua equipe usa?</label><select value={crm} onChange={event => setCrm(event.target.value)}>{CRM_OPTIONS.map(option => <option value={option[0]} key={option[0]}>{option[1]}{option[2] ? ` · ${option[2]}` : ""}</option>)}</select></div>
            )}
            <WizardFooter onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </>
        )}

        {step === 3 && (
          <div className="simple-wizard__finish">
            <div className="simple-wizard__fields">
              <label><span>Para qual cliente?</span><input autoFocus value={client} onChange={event => setClient(event.target.value)} placeholder="Digite o nome do cliente" /></label>
              {goal !== "movement" && <label><span>{isMeta ? "Qual é o formulário do anúncio?" : "Qual é a página?"}</span><input value={assetName} onChange={event => setAssetName(event.target.value)} placeholder={isMeta ? "Digite o nome do formulário" : "Cole o endereço ou digite o nome"} /></label>}
              {destination !== "crm" && goal !== "movement" && <label><span>{destination === "sheets" ? "Em qual planilha?" : destination === "v4chat" ? "Em qual caixa de entrada?" : "Para qual grupo ou pessoa?"}</span><input value={connectionValue} onChange={event => setConnectionValue(event.target.value)} placeholder={destination === "sheets" ? "Cole aqui o link da planilha" : "Digite aqui"} /></label>}
            </div>

            <div className="simple-summary simple-summary--confirmation">
              <span><Icons.CheckCircle /></span>
              <div><small>Você escolheu</small><strong>{selectedGoal?.[1]}</strong><p>Destino: {goal === "movement" ? selectedMovement?.[1] : destination === "crm" ? selectedCrm?.[1] : selectedDestination?.[1]}</p></div>
              <button type="button" onClick={reset}>Trocar</button>
            </div>

            {!ready && <div className="simple-wizard__pending"><Icons.Info /><span><strong>{loading ? "Verificando disponibilidade..." : "Esta opção ainda não está disponível"}</strong><small>{loading ? "Isso leva só alguns segundos." : "Peça ajuda à equipe técnica para preparar esse modelo."}</small></span></div>}

            <div className="simple-wizard__final-actions">
              <button type="button" className="btn btn--outline" onClick={() => onOpenGuide(guideTitle)}><Icons.HelpCircle />Ajuda</button>
              <button type="button" className="btn btn--primary" disabled={!ready || !client.trim()} onClick={() => ready && onUseTemplate(matchingTemplate, { client, assetName, connectionValue, source, goal, destination, crm, movement })}>{ready ? <>Continuar <Icons.ChevronRight /></> : loading ? "Verificando..." : "Indisponível"}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Choice({ option, selected = false, disabled = false, onClick }) {
  const ChoiceIcon = option[3];
  return <button type="button" className={`simple-choice ${selected ? "is-selected" : ""}`} disabled={disabled} onClick={onClick} aria-pressed={selected}><span><ChoiceIcon /></span><div><strong>{option[1]}</strong><small>{option[2]}</small></div><i>{selected ? <Icons.CheckCircle /> : <Icons.ChevronRight />}</i></button>;
}

function WizardFooter({ onBack, onNext }) {
  return <div className="simple-wizard__footer"><button type="button" className="btn btn--ghost" onClick={onBack}><Icons.ArrowLeft /> Voltar</button><button type="button" className="btn btn--primary flow-primary-action" onClick={onNext}>Continuar <Icons.ChevronRight /></button></div>;
}
