import { query } from '../db/pool.js';
import { createId } from '../utils/id.js';

const SENSITIVE_KEY_PATTERN = /(password|senha|secret|token|credential|encrypted|authorization|cookie|jwt)/i;
const MAX_JSON_CHARS = 8000;

function redactSensitiveData(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[max-depth]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactSensitiveData(item, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactSensitiveData(entry, depth + 1),
    ])
  );
}

function toJsonOrNull(value) {
  if (value === null || value === undefined) return null;
  const redacted = redactSensitiveData(value);
  const json = JSON.stringify(redacted);
  if (json.length <= MAX_JSON_CHARS) return json;
  return JSON.stringify({ truncated: true, preview: json.slice(0, MAX_JSON_CHARS) });
}

export async function recordAudit({
  organizationId = null,
  userId = null,
  entityType,
  entityId = null,
  action,
  beforeData = null,
  afterData = null,
  summary = null,
  severity = 'info',
  ipAddress = null,
  userAgent = null,
}) {
  if (!entityType || !action) return;

  await query(
    `INSERT INTO audit_logs
      (id, organization_id, user_id, entity_type, entity_id, action, before_data, after_data, summary, severity, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?)`,
    [
      createId(),
      organizationId,
      userId,
      entityType,
      entityId,
      action,
      toJsonOrNull(beforeData),
      toJsonOrNull(afterData),
      summary,
      severity,
      ipAddress,
      userAgent,
    ]
  );
}

export function audit(entityType, action, options = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      res.locals.auditAfter = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      if (!req.user?.id || res.statusCode >= 400) return;

      const afterBody = res.locals.auditAfter || null;
      const entityId = options.entityId?.(req, res)
        || req.params?.id
        || afterBody?.id
        || afterBody?.data?.id
        || null;

      recordAudit({
        organizationId: req.user.organization_id || null,
        userId: req.user.id,
        entityType,
        entityId,
        action,
        beforeData: res.locals.auditBefore || null,
        afterData: afterBody,
        summary: options.summary?.(req, res) || `${action} ${entityType}`,
        severity: options.severity || 'info',
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || null,
      }).catch((error) => console.error('[audit] erro ao gravar log:', error.message));
    });

    next();
  };
}
