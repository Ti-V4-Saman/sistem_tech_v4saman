export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  const payload = {
    error: status >= 500 ? 'Internal server error.' : error.message,
  };

  if (error.details) payload.details = error.details;
  if (status >= 500) console.error(error);

  res.status(status).json(payload);
}
