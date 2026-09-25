-- Migration 011: Fix flow_templates schema types and seed Meta Creative Recovery template

-- 1. Alter flow_templates organization_id to CHAR(36)
ALTER TABLE flow_templates MODIFY COLUMN organization_id CHAR(36) NOT NULL;

-- 2. Alter flow_requests columns to match UUIDs
ALTER TABLE flow_requests 
  MODIFY COLUMN organization_id CHAR(36) NOT NULL,
  MODIFY COLUMN requested_by_user_id CHAR(36) NOT NULL,
  MODIFY COLUMN client_id CHAR(36) NULL;

-- 3. Seed "Recuperação Criativos Meta" for existing organizations
INSERT INTO flow_templates (organization_id, name, slug, description, category, webhook_url, form_schema, is_active, display_order)
SELECT 
  id as organization_id,
  'Recuperação Criativos Meta',
  'recuperacao-criativos-meta',
  'Fluxo para recuperação de criativos da Meta Ads. Informe o ID da Conta e o ID do Criativo para disparar a automação.',
  'Meta Ads',
  'https://n8ops.v4saman.com/webhook/tecar-recuperacao-criativos-dashboard',
  '{"fields":[{"name":"account_id","label":"ID da Conta (Account ID)","type":"text","required":true},{"name":"creative_id","label":"ID do Criativo (Creative ID)","type":"text","required":true}]}',
  1,
  1
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM flow_templates ft 
  WHERE ft.organization_id = organizations.id AND ft.slug = 'recuperacao-criativos-meta'
);
