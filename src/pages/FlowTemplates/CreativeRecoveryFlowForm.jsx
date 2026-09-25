import { useState } from "react";
import { api } from "../../services/api";

const WEBHOOK_URL = "https://n8ops.v4saman.com/webhook/tecar-recuperacao-criativos-dashboard";

export function CreativeRecoveryFlowForm() {
  const [formData, setFormData] = useState({
    accountId: "",
    creativeId: "",
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const accountId = formData.accountId.trim();
    const creativeId = formData.creativeId.trim();

    if (!accountId) {
      setStatusMessage({ type: "error", text: "Informe o ID da conta de anúncios (Account ID)." });
      return;
    }

    if (!creativeId) {
      setStatusMessage({ type: "error", text: "Informe o ID do criativo (Creative ID)." });
      return;
    }

    const payload = {
      account_id: accountId,
      creative_id: creativeId,
      accountId: accountId,
      creativeId: creativeId,
      id_conta: accountId,
      id_criativo: creativeId,
      timestamp: new Date().toISOString(),
    };

    setLoading(true);

    try {
      // Tenta disparo direto para o webhook do n8n; fallback via proxy do backend se houver bloqueio por CORS
      let success = false;
      try {
        const directRes = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (directRes.ok) {
          success = true;
        }
      } catch (directErr) {
        console.warn("Disparo direto falhou (possível CORS), tentando via proxy do backend:", directErr);
      }

      if (!success) {
        await api.sendRecoveryCreativeWebhook(payload);
      }

      setStatusMessage({
        type: "success",
        text: "Fluxo de recuperação disparado com sucesso! A solicitação foi enviada ao webhook.",
      });

      // Limpa os campos
      setFormData({
        accountId: "",
        creativeId: "",
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Erro ao disparar o fluxo de recuperação de criativos.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v4-creative-recovery-wrapper">
      <style>{`
        .v4-creative-recovery-wrapper {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 10px 0 40px;
          font-family: inherit;
        }

        .v4-flow-header {
          margin-bottom: 28px;
        }

        .v4-flow-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #ff3c3c;
          background: rgba(255, 60, 60, 0.1);
          border: 1px solid rgba(255, 60, 60, 0.25);
          padding: 4px 10px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .v4-flow-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--foreground, #fff);
          letter-spacing: -0.5px;
          margin: 0;
        }

        .v4-flow-subtitle {
          color: var(--text-muted, rgba(255, 255, 255, 0.6));
          font-size: 14px;
          margin-top: 6px;
          line-height: 1.5;
        }

        .v4-flow-card {
          background: rgba(18, 18, 22, 0.85);
          border: 1px solid rgba(255, 60, 60, 0.18);
          border-radius: 18px;
          padding: 32px;
          backdrop-filter: blur(20px);
          box-shadow: 0 12px 35px -8px rgba(0, 0, 0, 0.6), 0 0 30px -10px rgba(255, 60, 60, 0.12);
        }

        .v4-grid {
          display: grid;
          gap: 22px;
        }

        .v4-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .v4-form-group label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .v4-form-group label span.required {
          color: #ff3c3c;
          margin-left: 2px;
        }

        .v4-form-group label span.hint {
          font-size: 11px;
          font-weight: normal;
          color: rgba(255, 255, 255, 0.45);
        }

        .v4-input {
          background: #0d0d10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 14px;
          color: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          outline: none;
          font-family: inherit;
        }

        .v4-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .v4-input:focus {
          border-color: #ff3c3c;
          box-shadow: 0 0 0 2px rgba(255, 60, 60, 0.25);
        }

        .v4-webhook-info {
          margin-top: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .v4-webhook-info code {
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          color: #ff8585;
          word-break: break-all;
        }

        .v4-submit-btn {
          margin-top: 28px;
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #ff3c3c, #ff5a5a);
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .v4-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 60, 60, 0.35);
        }

        .v4-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .v4-status-banner {
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: v4FadeIn 0.3s ease;
        }

        .v4-status-banner.success {
          background: rgba(46, 213, 115, 0.12);
          border: 1px solid rgba(46, 213, 115, 0.3);
          color: #2ed573;
        }

        .v4-status-banner.error {
          background: rgba(255, 71, 87, 0.12);
          border: 1px solid rgba(255, 71, 87, 0.3);
          color: #ff4757;
        }

        @keyframes v4FadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="v4-flow-header">
        <span className="v4-flow-badge">META ADS • RECUPERAÇÃO DE CRIATIVOS</span>
        <h1 className="v4-flow-title">Recuperação Criativos Meta</h1>
        <p className="v4-flow-subtitle">
          Dispare a automação de recuperação de criativos da Meta informando o ID da Conta e o ID do Criativo.
        </p>
      </div>

      <div className="v4-flow-card">
        {statusMessage && (
          <div className={`v4-status-banner ${statusMessage.type}`}>
            <span>{statusMessage.type === "success" ? "✓" : "⚠"}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="v4-grid">
          <div className="v4-form-group">
            <label>
              <span>ID da Conta (Account ID)<span className="required">*</span></span>
              <span className="hint">Meta Ads</span>
            </label>
            <input
              type="text"
              name="accountId"
              className="v4-input"
              placeholder="Ex: 123456789012345 ou act_123456789012345"
              required
              value={formData.accountId}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="v4-form-group">
            <label>
              <span>ID do Criativo (Creative ID)<span className="required">*</span></span>
              <span className="hint">Identificador do criativo</span>
            </label>
            <input
              type="text"
              name="creativeId"
              className="v4-input"
              placeholder="Ex: 12020293848123"
              required
              value={formData.creativeId}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="v4-webhook-info">
            <span>🔗</span>
            <div>
              <span>Disparo integrado ao webhook:</span>
              <br />
              <code>{WEBHOOK_URL}</code>
            </div>
          </div>

          <button type="submit" className="v4-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>Disparando recuperação...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Disparar Recuperação de Criativos</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
