ALTER TABLE stores ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(organization_id, is_active);
