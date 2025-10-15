DROP TRIGGER IF EXISTS check_low_stock_alert;
DROP TRIGGER IF EXISTS update_items_updated_at;
DROP TRIGGER IF EXISTS update_categories_updated_at;
DROP TRIGGER IF EXISTS update_users_updated_at;
DROP TRIGGER IF EXISTS update_organizations_updated_at;

DROP INDEX IF EXISTS idx_alerts_unread;
DROP INDEX IF EXISTS idx_alerts_organization;
DROP INDEX IF EXISTS idx_movements_created_at;
DROP INDEX IF EXISTS idx_movements_item;
DROP INDEX IF EXISTS idx_items_stock_level;
DROP INDEX IF EXISTS idx_items_category;
DROP INDEX IF EXISTS idx_items_organization;
DROP INDEX IF EXISTS idx_categories_organization;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_organization;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;