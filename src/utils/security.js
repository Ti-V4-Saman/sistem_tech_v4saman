const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "I", "LI", "OL", "P", "PRE", "SPAN", "STRONG", "U", "UL"
]);

const ALLOWED_ATTRIBUTES = {
  A: new Set(["href", "target", "rel", "title"]),
  SPAN: new Set(["title"]),
  DIV: new Set(["title"]),
  P: new Set(["title"]),
};

function isSafeHref(value = "") {
  const href = String(value).trim().toLowerCase();
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

/**
 * Sanitiza HTML rico antes de exibir/salvar notas vindas de contentEditable.
 * Mantém formatação básica, remove scripts, eventos inline e URLs perigosas.
 */
export function sanitizeRichHtml(html = "") {
  if (typeof window === "undefined" || !window.DOMParser) return "";

  const parser = new DOMParser();
  const documentRef = parser.parseFromString(String(html || ""), "text/html");

  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;

      if (child.nodeType !== Node.ELEMENT_NODE || !ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }

      [...child.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const allowed = ALLOWED_ATTRIBUTES[child.tagName]?.has(name);
        const isEventHandler = name.startsWith("on");

        if (!allowed || isEventHandler || name === "style") {
          child.removeAttribute(attribute.name);
          return;
        }

        if (child.tagName === "A" && name === "href" && !isSafeHref(attribute.value)) {
          child.removeAttribute("href");
        }
      });

      if (child.tagName === "A") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }

      walk(child);
    });
  };

  walk(documentRef.body);
  return documentRef.body.innerHTML.trim();
}

export function plainTextPreview(html = "", fallback = "") {
  if (typeof window === "undefined" || !window.DOMParser) return fallback;
  const parser = new DOMParser();
  const documentRef = parser.parseFromString(String(html || ""), "text/html");
  return documentRef.body.textContent?.trim() || fallback;
}
