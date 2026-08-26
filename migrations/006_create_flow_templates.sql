-- Migration for Flow Templates

-- 1. Table for Flow Templates
CREATE TABLE IF NOT EXISTS flow_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NULL,
  webhook_url TEXT NULL,
  form_schema JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Ensure unique slug per organization
  UNIQUE KEY uk_org_slug (organization_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table for Flow Requests (Execution history)
CREATE TABLE IF NOT EXISTS flow_requests (
  id VARCHAR(36) PRIMARY KEY,
  organization_id INT NOT NULL,
  template_id INT NOT NULL,
  requested_by_user_id INT NOT NULL,
  client_id INT NULL,
  payload JSON NULL,
  status ENUM('pending', 'processing', 'success', 'error') NOT NULL DEFAULT 'pending',
  http_status INT NULL,
  response TEXT NULL,
  error_message TEXT NULL,
  idempotency_key VARCHAR(100) NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Idempotency key must be unique to avoid double submissions
  UNIQUE KEY uk_org_idemp (organization_id, idempotency_key),
  
  -- Index for tracking history per user and template
  INDEX idx_user (requested_by_user_id),
  INDEX idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
