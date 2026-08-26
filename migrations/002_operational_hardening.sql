-- Operational hardening for audit, notifications and n8n execution history.
-- Idempotent guards avoid breaking databases restored from an existing dump.

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'summary'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN summary varchar(255) NULL AFTER after_data',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'severity'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE audit_logs ADD COLUMN severity varchar(40) NOT NULL DEFAULT ''info'' AFTER summary',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_created'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_created (created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_user_created'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_user_created (user_id, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELETE ar1 FROM automation_runs ar1
JOIN automation_runs ar2
  ON ar1.automation_id = ar2.automation_id
 AND ar1.external_run_id = ar2.external_run_id
 AND ar1.external_run_id IS NOT NULL
 AND (ar1.created_at < ar2.created_at OR (ar1.created_at = ar2.created_at AND ar1.id < ar2.id));

SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'automation_runs' AND INDEX_NAME = 'uniq_automation_runs_automation_external'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE automation_runs ADD UNIQUE KEY uniq_automation_runs_automation_external (automation_id, external_run_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_slug` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system',
  `priority` enum('low','medium','high','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `status` enum('unread','read','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unread',
  `entity_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_notifications_source_entity` (`organization_id`,`type`,`entity_type`,`entity_id`),
  KEY `idx_notifications_org_status_created` (`organization_id`,`status`,`created_at`),
  KEY `idx_notifications_user_status_created` (`user_id`,`status`,`created_at`),
  KEY `idx_notifications_role_status_created` (`role_slug`,`status`,`created_at`),
  CONSTRAINT `fk_notifications_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permissions (id, slug, description)
SELECT UUID(), 'notifications.view', 'Permite visualizar notificações operacionais'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'notifications.view');

INSERT INTO permissions (id, slug, description)
SELECT UUID(), 'notifications.manage', 'Permite criar e administrar notificações operacionais'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE slug = 'notifications.manage');
