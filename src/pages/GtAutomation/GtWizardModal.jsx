import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icons } from '../../icons/Icons';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const STEPS = [
  'Cliente',
  'Integrações',
  'Componentes',
  'Configuração',
  'Pré-validação',
  'Revisão',
  'Execução',
  'Conclusão'
];

export function GtWizardModal({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    selectionMode: 'recommended',
    components: [],
    metaEnabled: true,
    metaAdAccountId: '',
    googleEnabled: true,
    googleCustomerId: '',
    googleChannels: ['SEARCH', 'PERFORMANCE_MAX', 'SHOPPING'],
    wpEnabled: false,
    wpGroupId: '',
    chatEnabled: false,
    chatDestinationId: '',
    activateAfterValidation: false,
    testDestinations: true
  });

  const [preflightResult, setPreflightResult] = useState(null);
  const [jobResult, setJobResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getClients()
      .then(res => setClients(res.clients || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleNext = async () => {
    if (currentStep === 3) {
      // Execute Preflight
      setLoading(true);
      setError(null);
      try {
        const payload = buildContract();
        const res = await api.postAdminGtPreflight(payload);
        setPreflightResult(res);
        setCurrentStep(4);
      } catch (err) {
        setError('Falha na pré-validação: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      // Execute Plan -> Job
      setLoading(true);
      setError(null);
      try {
        const payload = buildContract();
        const res = await api.postAdminGtJobs(payload);
        setJobResult(res);
        setCurrentStep(6);
      } catch (err) {
        setError('Falha ao iniciar job: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const buildContract = () => {
    return {
      contract_version: "1.0",
      client: {
        id: formData.clientId,
        timezone: formData.timezone,
        currency: formData.currency
      },
      selection: {
        mode: formData.selectionMode,
        components: formData.selectionMode === 'recommended' 
          ? ["meta_ads_capture", "google_ads_capture"] // Simplificado, seria gerado com base nas integrações
          : formData.components
      },
      integrations: {
        meta: {
          enabled: formData.metaEnabled,
          ad_account_id: formData.metaAdAccountId,
          api_version: "v23.0"
        },
        google: {
          enabled: formData.googleEnabled,
          customer_id: formData.googleCustomerId.replace(/-/g, ''),
          api_version: "v22",
          channels: formData.googleChannels
        },
        google_chat: {
          enabled: formData.chatEnabled,
          destination_id: formData.chatDestinationId
        },
        whatsapp: {
          enabled: formData.wpEnabled,
          group_id: formData.wpGroupId
        }
      },
      options: {
        activate_after_validation: formData.activateAfterValidation,
        test_destinations: formData.testDestinations
      }
    };
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Selecione o Cliente</h3>
            <div>
              <label className="form-label">Cliente</label>
              <select className="form-input" value={formData.clientId} onChange={e => handleChange('clientId', e.target.value)}>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Moeda</label>
                <select className="form-input" value={formData.currency} onChange={e => handleChange('currency', e.target.value)}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Fuso Horário</label>
                <select className="form-input" value={formData.timezone} onChange={e => handleChange('timezone', e.target.value)}>
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Integrações</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={formData.metaEnabled} onChange={e => handleChange('metaEnabled', e.target.checked)} />
                Meta Ads
              </label>
              {formData.metaEnabled && (
                <input type="text" className="form-input" placeholder="Ad Account ID (act_...)" value={formData.metaAdAccountId} onChange={e => handleChange('metaAdAccountId', e.target.value)} />
              )}
              
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={formData.googleEnabled} onChange={e => handleChange('googleEnabled', e.target.checked)} />
                Google Ads
              </label>
              {formData.googleEnabled && (
                <input type="text" className="form-input" placeholder="Customer ID (000-000-0000)" value={formData.googleCustomerId} onChange={e => handleChange('googleCustomerId', e.target.value)} />
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Componentes</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <button 
                type="button"
                className={`btn ${formData.selectionMode === 'recommended' ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => handleChange('selectionMode', 'recommended')}
                style={{ flex: 1 }}
              >
                Pacote Recomendado
              </button>
              <button 
                type="button"
                className={`btn ${formData.selectionMode === 'individual' ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => handleChange('selectionMode', 'individual')}
                style={{ flex: 1 }}
              >
                Seleção Individual
              </button>
            </div>
            {formData.selectionMode === 'individual' && (
              <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                [Mock] Seletor de componentes individuais.
              </div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Configuração</h3>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={formData.activateAfterValidation} onChange={e => handleChange('activateAfterValidation', e.target.checked)} />
              Ativar após validação (GT 05)
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={formData.testDestinations} onChange={e => handleChange('testDestinations', e.target.checked)} />
              Testar destinos (Webhook/WP)
            </label>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Pré-validação</h3>
            {loading ? <LoadingSpinner /> : (
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                <pre style={{ fontSize: 12, overflowX: 'auto' }}>
                  {JSON.stringify(preflightResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Revisão</h3>
            <p className="text-muted">Revise o plano antes de executar a instalação no n8n.</p>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                <pre style={{ fontSize: 12, overflowX: 'auto' }}>
                  {JSON.stringify(buildContract(), null, 2)}
                </pre>
              </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4 text-center py-8">
            <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Execução</h3>
            {loading ? (
              <div><LoadingSpinner /><p style={{ marginTop: 16 }}>Enviando job para o GT 01...</p></div>
            ) : (
              <div className="alert alert--success">Job iniciado com sucesso. Acompanhe na tela principal.</div>
            )}
          </div>
        );
      case 7:
        return (
          <div className="space-y-4 text-center py-8">
            <Icons.CheckCircle style={{ width: 48, height: 48, color: 'var(--success)', margin: '0 auto' }} />
            <h3 style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Concluído</h3>
            <p className="text-muted">A requisição de automação foi finalizada.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ background: 'var(--bg-card)', width: '100%', maxWidth: 720, borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold' }}>Novo Provisionamento GT</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn--secondary" style={{ padding: '4px 12px' }} onClick={() => setShowHelp(true)}>
              <Icons.HelpCircle /> Como usar
            </button>
            <button className="btn btn--ghost" onClick={onClose}><Icons.X /></button>
          </div>
        </div>

        {/* Wizard Progress */}
        <div style={{ padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {STEPS.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', opacity: currentStep >= idx ? 1 : 0.5 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: currentStep === idx ? 'var(--color-primary)' : (currentStep > idx ? 'var(--success)' : 'var(--border)'), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>
                {idx + 1}
              </div>
              <span style={{ fontSize: 12, marginLeft: 8, fontWeight: currentStep === idx ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>{step}</span>
              {idx < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '0 8px' }} />}
            </div>
          ))}
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div className="alert alert--danger" style={{ marginBottom: 16 }}>{error}</div>}
          {renderStep()}
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn--secondary" disabled={currentStep === 0 || loading || currentStep >= 6} onClick={handleBack}>Voltar</button>
          
          {currentStep < 7 ? (
            <button className="btn btn--primary" onClick={handleNext} disabled={loading || (currentStep === 0 && !formData.clientId)}>
              {currentStep === 3 ? 'Validar' : currentStep === 5 ? 'Executar' : 'Avançar'}
            </button>
          ) : (
            <button className="btn btn--primary" onClick={onClose}>Fechar</button>
          )}
        </div>
      </div>

      {showHelp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-card)', width: 600, borderRadius: 12, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 'bold' }}>Ajuda: Central GT</h3>
              <button className="btn btn--ghost" onClick={() => setShowHelp(false)}><Icons.X /></button>
            </div>
            
            <h4 style={{ fontWeight: 'bold', marginTop: 16 }}>Glossário</h4>
            <ul style={{ paddingLeft: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li><strong>GT 00 (Preflight):</strong> Valida permissões e disponibilidade dos componentes solicitados no n8n.</li>
              <li><strong>GT 01 (Provisionamento):</strong> Cria fisicamente os bancos, tabelas e copia os workflows para o cliente.</li>
              <li><strong>GT 05 (Ativação):</strong> Liga e desliga schedulers (cron) após o sucesso do deploy.</li>
              <li><strong>Subtipos E-commerce:</strong> No Google Ads, as campanhas PMax de varejo devem usar este filtro para não duplicar dados com outras contas Standard.</li>
            </ul>

            <h4 style={{ fontWeight: 'bold', marginTop: 16 }}>Dados Seguros</h4>
            <p style={{ marginBottom: 16, fontSize: 14 }}>
              Nunca insira tokens de acesso ou senhas neste formulário. A Central resolve as credenciais através de chaves internas (`gt_mysql_client`) e anexa ao contrato antes de enviar ao webhook de forma segura.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
