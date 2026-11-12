-- Estrutura de áreas, ícones, documentos relacionados e histórico da base de conhecimento.

CREATE TABLE IF NOT EXISTS document_folders (
  id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(32) NOT NULL DEFAULT '📁',
  created_by CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_document_folders_org_name (organization_id, name),
  KEY idx_document_folders_org (organization_id),
  KEY fk_document_folders_creator (created_by),
  CONSTRAINT fk_document_folders_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT fk_document_folders_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE documents
  ADD COLUMN folder_id CHAR(36) DEFAULT NULL AFTER client_id,
  ADD COLUMN icon VARCHAR(32) NOT NULL DEFAULT '📄' AFTER folder_id,
  ADD KEY idx_documents_folder (folder_id),
  ADD CONSTRAINT fk_documents_folder FOREIGN KEY (folder_id) REFERENCES document_folders (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS document_relations (
  document_id CHAR(36) NOT NULL,
  related_document_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, related_document_id),
  KEY idx_document_relations_related (related_document_id),
  CONSTRAINT fk_document_relations_document FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  CONSTRAINT fk_document_relations_related FOREIGN KEY (related_document_id) REFERENCES documents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO document_versions (id, document_id, version_number, content, created_by, created_at)
SELECT UUID(), d.id, 1, d.content, d.author_user_id, d.created_at
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM document_versions dv WHERE dv.document_id = d.id
);
