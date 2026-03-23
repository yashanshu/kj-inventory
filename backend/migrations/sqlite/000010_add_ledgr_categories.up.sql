-- 000010_add_ledgr_categories.up.sql

CREATE TABLE ledgr_categories (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    is_system   INTEGER NOT NULL DEFAULT 0,   -- system categories are not deletable
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, name)
);

CREATE INDEX idx_ledgr_categories_org ON ledgr_categories(org_id);

-- System categories are seeded per org by application code on first setup,
-- not in this migration (org IDs are not known at migration time).
