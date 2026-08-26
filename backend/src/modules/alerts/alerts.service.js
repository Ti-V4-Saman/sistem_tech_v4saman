import { query } from '../../db/pool.js';
import { createId } from '../../utils/id.js';

/**
 * Process a run to generate or update operational alerts if it failed.
 */
export async function processAutomationRunForAlerts({
  organizationId,
  clientId,
  automationId,
  automationRunId,
  externalRunId,
  status,
  errorMessage,
  occurredAt
}) {
  const isError = ['error', 'failed', 'failure', 'crashed'].includes(String(status || '').toLowerCase());
  if (!isError) return;

  // 1. Check Preferences
  // We need to check if notifications are disabled for this automation or its client.
  const prefsQuery = await query(
    `SELECT entity_type, entity_id, enabled 
     FROM notification_preferences 
     WHERE organization_id = ? 
       AND (
         (entity_type = 'automation' AND entity_id = ?) 
         OR (entity_type = 'client' AND entity_id = ?)
       )`,
    [organizationId, automationId, clientId || 0]
  );
  
  // If either the client or the automation has notifications disabled, do not generate alert
  for (const pref of prefsQuery.rows) {
    if (pref.enabled === 0) return; 
  }

  // 2. Find existing open alert for this automation
  const alertsQuery = await query(
    `SELECT id FROM operational_alerts 
     WHERE organization_id = ? AND automation_id = ? AND status = 'open' 
     LIMIT 1`,
    [organizationId, automationId]
  );

  let alertId;
  const mysqlOccurredAt = occurredAt ? new Date(occurredAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

  if (alertsQuery.rows.length > 0) {
    alertId = alertsQuery.rows[0].id;
    // Update existing
    await query(
      `UPDATE operational_alerts 
       SET occurrence_count = occurrence_count + 1, 
           last_seen_at = GREATEST(last_seen_at, ?),
           last_automation_run_id = ?,
           last_error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [mysqlOccurredAt, automationRunId, errorMessage || null, alertId]
    );
  } else {
    // Create new alert
    alertId = createId();
    try {
      await query(
        `INSERT INTO operational_alerts 
         (id, organization_id, client_id, automation_id, status, occurrence_count, first_seen_at, last_seen_at, last_automation_run_id, last_error_message)
         VALUES (?, ?, ?, ?, 'open', 1, ?, ?, ?, ?)`,
        [alertId, organizationId, clientId || null, automationId, mysqlOccurredAt, mysqlOccurredAt, automationRunId, errorMessage || null]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Someone else created it concurrently. Find it and update.
        const concurrentQuery = await query(
          `SELECT id FROM operational_alerts WHERE organization_id = ? AND automation_id = ? AND status = 'open' LIMIT 1`,
          [organizationId, automationId]
        );
        if (concurrentQuery.rows[0]) {
          alertId = concurrentQuery.rows[0].id;
          await query(
            `UPDATE operational_alerts SET occurrence_count = occurrence_count + 1, last_seen_at = GREATEST(last_seen_at, ?), last_automation_run_id = ?, last_error_message = ? WHERE id = ?`,
            [mysqlOccurredAt, automationRunId, errorMessage || null, alertId]
          );
        } else {
          return; // Giving up, should be rare
        }
      } else {
        throw err;
      }
    }
  }

  // 3. Insert specific event
  try {
    await query(
      `INSERT INTO operational_alert_events 
       (id, organization_id, alert_id, automation_run_id, external_run_id, error_message, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [createId(), organizationId, alertId, automationRunId, externalRunId || null, errorMessage || null, mysqlOccurredAt]
    );
  } catch (err) {
    // If ER_DUP_ENTRY, it means this run was already counted (unique key on organization_id, automation_run_id).
    // We can just ignore it to avoid double-counting events.
    if (err.code !== 'ER_DUP_ENTRY') throw err;
  }
}
