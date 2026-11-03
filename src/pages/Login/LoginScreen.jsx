import { useState, useEffect, useRef } from "react";
import { api } from "../../services/api";
import { BrandMark } from "../../components/app/BrandMark";
import { Icons } from "../../icons/Icons";

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState("");
  const [developmentLoginEnabled, setDevelopmentLoginEnabled] = useState(false);

  const googleButtonRef = useRef(null);
  const [activeClientId, setActiveClientId] = useState(() => {
    const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    return (envId && !envId.includes("seu-client-id")) ? envId : "";
  });
  const [activeDomain, setActiveDomain] = useState(import.meta.env.VITE_GOOGLE_ALLOWED_DOMAIN || "v4company.com");

  // Busca a configuração pública de autenticação do backend.
  useEffect(() => {
    let alive = true;
    api.getAuthConfig()
      .then((config) => {
        if (!alive) return;
        if (config?.googleClientId) setActiveClientId(config.googleClientId);
        if (config?.googleAllowedDomain) setActiveDomain(config.googleAllowedDomain);
        setDevelopmentLoginEnabled(config?.developmentLoginEnabled === true);
      })
      .catch((err) => console.error("Erro ao carregar auth config:", err));
    return () => { alive = false; };
  }, []);

  // Carrega o SDK do Google Identity Services
  useEffect(() => {
    if (!activeClientId) return;
    const existing = document.querySelector('script[data-google-identity="true"]');
    const loadScript = () => new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve();
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    loadScript()
      .then(() => setGoogleReady(true))
      .catch(() => setError("Não foi possível carregar o login do Google. Verifique sua conexão."));
  }, [activeClientId]);

  // Renderiza o botão do Google
  useEffect(() => {
    if (!googleReady || !googleButtonRef.current || !window.google?.accounts?.id || !activeClientId) return;
    googleButtonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: activeClientId,
      hosted_domain: activeDomain,
      callback: async ({ credential }) => {
        setLoading(true);
        setError("");
        try {
          const session = await api.loginWithGoogle(credential);
          onLogin(session);
        } catch (err) {
          setError(err.message || "Não foi possível autenticar com Google.");
        } finally {
          setLoading(false);
        }
      },
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: theme === "dark" ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 280,
    });
  }, [googleReady, activeClientId, activeDomain, loading, onLogin, theme]);

  const handleDevelopmentLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await api.loginForDevelopment();
      onLogin(session);
    } catch (err) {
      setError(err.message || "Não foi possível entrar no ambiente de desenvolvimento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ background: theme === "dark" ? "var(--bg-page)" : "#fbfbfb" }}>
      <button className="theme-toggle login-theme-toggle" onClick={onToggleTheme} type="button" aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
        {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
      </button>

      <div
        className="login-card"
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 40px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-lg)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <BrandMark />
        <span className="login-card__eyebrow">Central de operações</span>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
          TechOps · V4 Company
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>
          {developmentLoginEnabled ? "Entre rapidamente para testar o sistema." : "Acesse com sua conta corporativa Google."}
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
              border: "1px solid rgba(239, 68, 68, 0.2)",
              width: "100%",
              boxSizing: "border-box",
              textAlign: "left",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 0" }}>
            <div
              className="spinner"
              style={{
                width: 28,
                height: 28,
                border: "3px solid rgba(0,0,0,0.1)",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Entrando...</span>
          </div>
        ) : (
          <div className="login-options">
            {developmentLoginEnabled && (
              <>
                <button type="button" className="login-development-button" onClick={handleDevelopmentLogin}>
                  <Icons.Zap />
                  <span><strong>Entrar no ambiente de desenvolvimento</strong><small>Sem usar uma conta Google</small></span>
                  <Icons.ChevronRight />
                </button>
                <div className="login-divider"><span>ou entre com Google</span></div>
              </>
            )}
            <div ref={googleButtonRef} style={{ display: "flex", justifyContent: "center", minHeight: "44px" }} />
          </div>
        )}

        {!activeClientId && (
          <div className="login-warning" style={{ marginTop: 16 }}>
            Configure <code>GOOGLE_CLIENT_ID</code> no seu .env para ativar o login.
          </div>
        )}

        {developmentLoginEnabled ? (
          <div className="login-development-note"><span />Modo de desenvolvimento ativo</div>
        ) : (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 24 }}>
            Somente contas do domínio <strong>@{activeDomain}</strong> são aceitas.
          </p>
        )}
      </div>
    </div>
  );
}
