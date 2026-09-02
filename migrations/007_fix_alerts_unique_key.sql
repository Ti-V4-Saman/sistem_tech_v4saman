-- Migration 007: Fix operational_alerts unique constraint to allow multiple resolved alerts

ALTER TABLE operational_alerts DROP INDEX uk_org_auto_open;

ALTER TABLE operational_alerts 
  ADD COLUMN open_status VARCHAR(10) GENERATED ALWAYS AS (IF(status = 'open', 'open', NULL)) VIRTUAL;

ALTER TABLE operational_alerts 
  ADD UNIQUE KEY uk_org_auto_open (organization_id, automation_id, open_status);
