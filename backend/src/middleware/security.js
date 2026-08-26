const requestHits = new Map();

// Limpeza periódica para evitar vazamento de memória em produção
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestHits) {
    if (entry.resetAt < now) requestHits.delete(key);
  }
}, 5 * 60_000); // a cada 5 minutos

// Evita que o timer de limpeza mantenha o processo vivo em scripts/testes.
cleanupTimer.unref?.();

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function rateLimit({ windowMs = 60_000, limit = 120 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = requestHits.get(key) || { count: 0, resetAt: now + windowMs };

    if (current.resetAt < now) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    requestHits.set(key, current);

    if (current.count > limit) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    return next();
  };
}
