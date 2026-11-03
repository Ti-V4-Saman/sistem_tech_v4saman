-- Índices compostos para as consultas críticas de Operação e Clientes.
-- Esta migration é executada uma única vez pelo controle schema_migrations.

ALTER TABLE clients
  ADD INDEX idx_clients_org_unit_name (organization_id, unit, name);

ALTER TABLE automations
  ADD INDEX idx_automations_client_active_status (client_id, is_active, status);

ALTER TABLE bots
  ADD INDEX idx_bots_client_published_status (client_id, is_published, status);

ALTER TABLE automation_runs
  ADD INDEX idx_runs_automation_started_created (automation_id, started_at, created_at),
  ADD INDEX idx_runs_started_automation_status (started_at, automation_id, status);

ALTER TABLE operational_alerts
  ADD INDEX idx_alerts_org_status_last_seen (organization_id, status, last_seen_at, client_id);

ALTER TABLE credentials
  ADD INDEX idx_credentials_client_expires (client_id, expires_at);

ALTER TABLE tickets
  ADD INDEX idx_tickets_org_status_priority (organization_id, status, priority);

ALTER TABLE incidents
  ADD INDEX idx_incidents_org_status_severity (organization_id, status, severity);
