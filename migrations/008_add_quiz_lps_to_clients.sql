-- Migration 008: Add quiz and lps columns to clients table
SET @col_quiz = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'quiz');
SET @sql_quiz = IF(@col_quiz = 0, 'ALTER TABLE clients ADD COLUMN quiz VARCHAR(120) NULL AFTER unit;', 'SELECT 1;');
PREPARE stmt_quiz FROM @sql_quiz;
EXECUTE stmt_quiz;
DEALLOCATE PREPARE stmt_quiz;

SET @col_lps = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'lps');
SET @sql_lps = IF(@col_lps = 0, 'ALTER TABLE clients ADD COLUMN lps VARCHAR(120) NULL AFTER quiz;', 'SELECT 1;');
PREPARE stmt_lps FROM @sql_lps;
EXECUTE stmt_lps;
DEALLOCATE PREPARE stmt_lps;
