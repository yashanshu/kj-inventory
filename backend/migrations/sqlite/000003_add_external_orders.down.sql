-- Rollback external orders table
DROP INDEX IF EXISTS idx_external_orders_platform_date;
DROP INDEX IF EXISTS idx_external_orders_date;
DROP INDEX IF EXISTS idx_external_orders_platform;
DROP TABLE IF EXISTS external_orders;
