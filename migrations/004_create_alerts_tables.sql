-- Migration for Operational Alerts System

-- 1. Table for Operational Alerts (one per automation per organization)
CREATE TABLE IF NOT EXISTS operational_alerts (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NULL,
  automation_id VARCHAR(36) NOT NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  last_automation_run_id VARCHAR(255) NULL,
  last_error_message TEXT NULL,
  resolved_at DATETIME NULL,
  resolved_by_user_id VARCHAR(36) NULL,
  resolution_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Prevent multiple open alerts for the same automation in the same org
  UNIQUE KEY uk_org_auto_open (organization_id, automation_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table for Operational Alert Events (each specific occurrence)
CREATE TABLE IF NOT EXISTS operational_alert_events (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  alert_id VARCHAR(36) NOT NULL,
  automation_run_id VARCHAR(255) NOT NULL,
  external_run_id VARCHAR(255) NULL,
  error_message TEXT NULL,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Prevent counting the exact same automation run multiple times
  UNIQUE KEY uk_org_run (organization_id, automation_run_id),
  FOREIGN KEY (alert_id) REFERENCES operational_alerts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table for Notification Preferences (disable per client or per automation)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  entity_type ENUM('client', 'automation') NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by_user_id VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Only one preference per entity
  UNIQUE KEY uk_org_entity (organization_id, entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
