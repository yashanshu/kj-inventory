DROP TRIGGER IF EXISTS check_low_stock_alert;
DROP TRIGGER IF EXISTS update_items_updated_at;
DROP TRIGGER IF EXISTS update_categories_updated_at;
DROP TRIGGER IF EXISTS update_users_updated_at;
DROP TRIGGER IF EXISTS update_stores_updated_at;
DROP TRIGGER IF EXISTS update_organizations_updated_at;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS organizations;
