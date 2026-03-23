-- 000008_add_ledgr_bootstrap.down.sql
-- Intentional no-op: in combined deployment, organizations and stores are
-- inventory-owned and must not be dropped. In standalone, dropping them would
-- destroy all data. The application layer handles cleanup when needed.
SELECT 1;
