/**
 * @module formatters
 * @description Funções utilitárias de formatação usadas em todo o sistema.
 */

/**
 * Formata uma data para o padrão brasileiro DD/MM/YYYY HH:MM.
 * @param {string|Date} value - Valor de data a ser formatado.
 * @returns {string} Data formatada ou string original se inválida.
 */
export function formatDocDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formata data/hora com locale pt-BR.
 * @param {string|Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return "Nunca acessou";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

/**
 * Formata valor como moeda BRL.
 * @param {number} val
 * @returns {string}
 */
export function formatCurrency(val) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

/**
 * Extrai iniciais de um nome ou e-mail.
 * @param {string} nameOrEmail
 * @returns {string} Até 2 caracteres em maiúsculo.
 */
export function getInitials(nameOrEmail = "U") {
  const clean = String(nameOrEmail).replace(/@.*/, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "U";
}

/**
 * Remove tags HTML e retorna apenas o texto.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/**
 * Retorna estilo de badge baseado no slug de acesso.
 * @param {string} slug
 * @returns {object} Objeto de estilo CSS inline.
 */
export function roleBadgeStyle(slug) {
  if (slug === "super-admin")
    return { background: "var(--n-800)", color: "#fff" };
  if (slug === "admin")
    return { background: "var(--v4-100)", color: "var(--v4-700)" };
  return {};
}

/**
 * Retorna saudação baseada na hora atual.
 * @returns {string}
 */
export function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return "Bom dia";
  if (hr < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Retorna o primeiro e o último nome de uma pessoa.
 * @param {string} fullName
 * @returns {string}
 */
export function formatShortName(fullName) {
  if (!fullName) return "";
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
