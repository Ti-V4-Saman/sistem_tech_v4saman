import { useEffect, useState } from "react";
import { api } from "../../services/api";

function formatLastCheck(date) {
  if (!date) return "não verificado";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function SystemHealthIndicator() {
  const [state, setState] = useState({ status: "checking", lastCheck: null, message: "Verificando API" });

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        await api.healthcheck();
        if (alive) setState({ status: "online", lastCheck: new Date(), message: "API online" });
      } catch (error) {
        if (alive) setState({ status: "offline", lastCheck: new Date(), message: error.message || "API offline" });
      }
    };

    check();
    const interval = setInterval(check, 45000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <button
      type="button"
      className={`system-health system-health--${state.status}`}
      title={`${state.message}. Última verificação: ${formatLastCheck(state.lastCheck)}`}
      onClick={() => window.location.reload()}
    >
      <span className="system-health__dot" />
      <span className="system-health__text">{state.status === "online" ? "API online" : state.status === "offline" ? "API offline" : "Verificando"}</span>
      <span className="system-health__time">{formatLastCheck(state.lastCheck)}</span>
    </button>
  );
}
