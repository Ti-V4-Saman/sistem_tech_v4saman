-- Migration for Telephony System

CREATE TABLE IF NOT EXISTS phone_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  normalized_number VARCHAR(50) NOT NULL,
  display_number VARCHAR(50) NOT NULL,
  category ENUM('fixo', 'celular', 'celular_voip') NOT NULL,
  routing VARCHAR(255) NULL,
  monthly_fee DECIMAL(10, 2) NULL,
  status ENUM('ativo', 'aguardando_ativacao', 'inativo') NOT NULL DEFAULT 'ativo',
  responsible_name VARCHAR(255) NULL,
  sector VARCHAR(255) NULL,
  team_name VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- The same number cannot be duplicated within an organization
  UNIQUE KEY uk_org_number (organization_id, normalized_number),
  
  -- Indices for faster querying and filtering
  INDEX idx_org (organization_id),
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_team (team_name),
  INDEX idx_responsible (responsible_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
