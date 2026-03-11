DROP INDEX IF EXISTS idx_stores_active;
-- SQLite does not support DROP COLUMN before 3.35.0; column stays but migration is marked rolled back.
