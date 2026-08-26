-- 003_fullstack_fixes.sql
-- Adição de índices para otimização de consultas de dashboard e listagens

-- Otimizar buscas por ação no audit_logs
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs' AND INDEX_NAME = 'idx_audit_logs_action'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE audit_logs ADD INDEX idx_audit_logs_action (action, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Otimizar notificações pendentes
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_unread'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE notifications ADD INDEX idx_notifications_unread (status, read_at)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Otimizar dashboard clients active
SET @idx_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND INDEX_NAME = 'idx_clients_status_health'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE clients ADD INDEX idx_clients_status_health (status, health_score)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
