export function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

export function created(res, data) {
  return ok(res, data, 201);
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
