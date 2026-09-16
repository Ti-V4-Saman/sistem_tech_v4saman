import { useState } from "react";
import { api } from "../../services/api";

const SQUADS = ["BRIU", "SEALS", "BRAVO", "SNIPERS", "BALBOA"];
const WHATS_SUFFIX = "@g.us";

export function ClientFlowForm({ defaultResponsible = "" }) {
  const [formData, setFormData] = useState({
    responsavel: defaultResponsible || "",
    squad: "",
    cliente: "",
    bm: "",
    webhook: "",
    webhookManual: false,
    fluxoMeta: false,
    metaSheet: "",
    fluxoGoogle: false,
    googleSheet: "",
    grupoInterno: false,
    internoChat: "",
    grupoCliente: false,
    clienteWhatsappBase: "",
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const handleClienteChange = (e) => {
    const val = e.target.value;
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    setFormData((prev) => ({
      ...prev,
      cliente: val,
      webhook: prev.webhookManual ? prev.webhook : slug ? `${slug}-google-ads` : "",
    }));
  };

  const handleBmChange = (e) => {
    const numeric = e.target.value.replace(/\D/g, "").slice(0, 16);
    setFormData((prev) => ({ ...prev, bm: numeric }));
  };

  const handleWhatsappBaseChange = (e) => {
    const clean = e.target.value.replace(/@g\.us$/i, "").trim();
    setFormData((prev) => ({ ...prev, clienteWhatsappBase: clean }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    // Validations
    if (formData.bm && formData.bm.length !== 16) {
      setStatusMessage({ type: "error", text: "O ID da BM deve conter exatamente 16 números." });
      return;
    }

    if (formData.fluxoMeta && !formData.metaSheet.trim().startsWith("https://docs.google.com/spreadsheets/")) {
      setStatusMessage({ type: "error", text: "Informe uma URL válida do Google Sheets para o Fluxo Meta Ads." });
      return;
    }

    if (formData.fluxoGoogle && !formData.googleSheet.trim().startsWith("https://docs.google.com/spreadsheets/")) {
      setStatusMessage({ type: "error", text: "Informe uma URL válida do Google Sheets para o Fluxo Google Ads." });
      return;
    }

    const payload = {
      responsavel: formData.responsavel.trim(),
      squad: formData.squad,
      cliente: formData.cliente.trim(),
      bm: formData.bm || null,
      webhook: formData.webhook.trim() || null,
      fluxoMeta: Boolean(formData.fluxoMeta),
      metaSheet: formData.fluxoMeta ? formData.metaSheet.trim() : null,
      fluxoGoogle: Boolean(formData.fluxoGoogle),
      googleSheet: formData.fluxoGoogle ? formData.googleSheet.trim() : null,
      grupoInterno: Boolean(formData.grupoInterno),
      internoChat: formData.grupoInterno ? formData.internoChat.trim() : null,
      grupoCliente: Boolean(formData.grupoCliente),
      clienteWhatsapp: formData.grupoCliente && formData.clienteWhatsappBase.trim()
        ? `${formData.clienteWhatsappBase.trim()}${WHATS_SUFFIX}`
        : null,
    };

    setLoading(true);

    try {
      // First try sending directly to the n8n webhook; fallback to backend proxy if CORS prevents it
      let success = false;
      try {
        const directRes = await fetch("https://n8ops.v4saman.com/webhook/v4saman-criador-de-fluxos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (directRes.ok) {
          success = true;
        }
      } catch (directErr) {
        console.warn("Direct webhook dispatch failed (likely CORS), attempting via backend proxy:", directErr);
      }

      if (!success) {
        await api.sendClientFlowWebhook(payload);
      }

      setStatusMessage({ type: "success", text: "Cliente cadastrado e fluxo disparado com sucesso!" });

      // Reset form
      setFormData({
        responsavel: defaultResponsible || "",
        squad: "",
        cliente: "",
        bm: "",
        webhook: "",
        webhookManual: false,
        fluxoMeta: false,
        metaSheet: "",
        fluxoGoogle: false,
        googleSheet: "",
        grupoInterno: false,
        internoChat: "",
        grupoCliente: false,
        clienteWhatsappBase: "",
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: "error", text: err.message || "Erro ao cadastrar cliente e disparar fluxo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v4-client-flow-wrapper">
      <style>{`
        .v4-client-flow-wrapper {
          width: 100%;
          max-width: 780px;
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
          gap: 20px;
        }

        .v4-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 640px) {
          .v4-grid-2 {
            grid-template-columns: 1fr;
          }
          .v4-flow-card {
            padding: 20px;
          }
        }

        .v4-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .v4-form-group label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .v4-form-group label span {
          color: #ff3c3c;
          margin-left: 2px;
        }

        .v4-input, .v4-select {
          background: #0d0d10;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 14px;
          color: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          outline: none;
        }

        .v4-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .v4-input:focus, .v4-select:focus {
          border-color: #ff3c3c;
          box-shadow: 0 0 0 2px rgba(255, 60, 60, 0.25);
        }

        .v4-select {
          cursor: pointer;
        }

        .v4-select option {
          background: #151518;
          color: #fff;
        }

        .v4-checkbox-section {
          margin-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
        }

        .v4-checkbox-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 16px;
          color: rgba(255, 255, 255, 0.9);
          user-select: none;
        }

        .v4-checkbox-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #ff3c3c;
          cursor: pointer;
        }

        .v4-conditional {
          margin-top: 12px;
          margin-left: 30px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          animation: v4FadeIn 0.2s ease-in-out;
        }

        @keyframes v4FadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .v4-inline-whats {
          display: flex;
          align-items: center;
        }

        .v4-inline-whats input {
          flex: 1;
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .v4-whats-suffix {
          background: #141418;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-left: none;
          padding: 13px 14px;
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #ff5a5a;
        }

        .v4-submit-btn {
          margin-top: 32px;
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
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .v4-status-banner.success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }

        .v4-status-banner.error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
      `}</style>

      <div className="v4-flow-header">
        <div className="v4-flow-badge">V4 OPERAÇÕES</div>
        <h1 className="v4-flow-title">Cadastro de Novo Cliente</h1>
        <div className="v4-flow-subtitle">Estruturação operacional e automações.</div>
      </div>

      <div className="v4-flow-card">
        {statusMessage && (
          <div className={`v4-status-banner ${statusMessage.type}`}>
            <span>{statusMessage.type === "success" ? "✓" : "⚠️"}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="v4-grid">
            {/* Responsável */}
            <div className="v4-form-group">
              <label>
                Nome completo do responsável <span>*</span>
              </label>
              <input
                type="text"
                className="v4-input"
                placeholder="Nome completo"
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                required
              />
            </div>

            {/* Squad & Cliente */}
            <div className="v4-grid-2">
              <div className="v4-form-group">
                <label>
                  Squad <span>*</span>
                </label>
                <select
                  className="v4-select"
                  value={formData.squad}
                  onChange={(e) => setFormData({ ...formData, squad: e.target.value })}
                  required
                >
                  <option value="">Selecione</option>
                  {SQUADS.map((sq) => (
                    <option key={sq} value={sq}>
                      {sq}
                    </option>
                  ))}
                </select>
              </div>

              <div className="v4-form-group">
                <label>
                  Nome do Cliente <span>*</span>
                </label>
                <input
                  type="text"
                  className="v4-input"
                  placeholder="Nome do cliente"
                  value={formData.cliente}
                  onChange={handleClienteChange}
                  required
                />
              </div>
            </div>

            {/* BM & Webhook */}
            <div className="v4-grid-2">
              <div className="v4-form-group">
                <label>ID da BM do Cliente</label>
                <input
                  type="text"
                  className="v4-input"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="16 números (ex: 1234567890123456)"
                  value={formData.bm}
                  onChange={handleBmChange}
                />
              </div>

              <div className="v4-form-group">
                <label>Webhook sugerido Google ADS</label>
                <input
                  type="text"
                  className="v4-input"
                  placeholder="[nome-cliente]-google-ads"
                  value={formData.webhook}
                  onChange={(e) =>
                    setFormData({ ...formData, webhook: e.target.value, webhookManual: true })
                  }
                />
              </div>
            </div>
          </div>

          {/* Seções de automações / Checkboxes */}
          <div className="v4-checkbox-section">
            {/* Meta Ads */}
            <label className="v4-checkbox-item">
              <input
                type="checkbox"
                checked={formData.fluxoMeta}
                onChange={(e) => setFormData({ ...formData, fluxoMeta: e.target.checked })}
              />
              Ativar Fluxo Meta Ads
            </label>

            {formData.fluxoMeta && (
              <div className="v4-conditional">
                <div className="v4-form-group">
                  <label>
                    URL Google Sheets - Meta <span>*</span>
                  </label>
                  <input
                    type="url"
                    className="v4-input"
                    placeholder="https://docs.google.com/spreadsheets/..."
                    value={formData.metaSheet}
                    onChange={(e) => setFormData({ ...formData, metaSheet: e.target.value })}
                    required={formData.fluxoMeta}
                  />
                </div>
              </div>
            )}

            {/* Google Ads */}
            <label className="v4-checkbox-item">
              <input
                type="checkbox"
                checked={formData.fluxoGoogle}
                onChange={(e) => setFormData({ ...formData, fluxoGoogle: e.target.checked })}
              />
              Ativar Fluxo Google Ads
            </label>

            {formData.fluxoGoogle && (
              <div className="v4-conditional">
                <div className="v4-form-group">
                  <label>
                    URL Google Sheets - Google <span>*</span>
                  </label>
                  <input
                    type="url"
                    className="v4-input"
                    placeholder="https://docs.google.com/spreadsheets/..."
                    value={formData.googleSheet}
                    onChange={(e) => setFormData({ ...formData, googleSheet: e.target.value })}
                    required={formData.fluxoGoogle}
                  />
                </div>
              </div>
            )}

            {/* Disparo Interno V4 */}
            <label className="v4-checkbox-item">
              <input
                type="checkbox"
                checked={formData.grupoInterno}
                onChange={(e) => setFormData({ ...formData, grupoInterno: e.target.checked })}
              />
              Ativar Disparo Interno V4
            </label>

            {formData.grupoInterno && (
              <div className="v4-conditional">
                <div className="v4-form-group">
                  <label>Google Chat - Interno</label>
                  <input
                    type="text"
                    className="v4-input"
                    placeholder="URL ou ID do Google Chat"
                    value={formData.internoChat}
                    onChange={(e) => setFormData({ ...formData, internoChat: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Disparo Cliente WhatsApp */}
            <label className="v4-checkbox-item">
              <input
                type="checkbox"
                checked={formData.grupoCliente}
                onChange={(e) => setFormData({ ...formData, grupoCliente: e.target.checked })}
              />
              Ativar Disparo Cliente
            </label>

            {formData.grupoCliente && (
              <div className="v4-conditional">
                <div className="v4-form-group">
                  <label>WhatsApp - Cliente</label>
                  <div className="v4-inline-whats">
                    <input
                      type="text"
                      className="v4-input"
                      placeholder="ID do grupo"
                      value={formData.clienteWhatsappBase}
                      onChange={handleWhatsappBaseChange}
                      required={formData.grupoCliente}
                    />
                    <div className="v4-whats-suffix">@g.us</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="v4-submit-btn" disabled={loading}>
            {loading ? "Cadastrando e disparando..." : "Cadastrar Cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}
