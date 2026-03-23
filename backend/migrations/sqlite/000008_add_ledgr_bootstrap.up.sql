-- 000008_add_ledgr_bootstrap.up.sql
-- Ledgr module bootstrap: organizations and stores tables.
-- In combined deployment (inventory module present), these tables already exist.
-- CREATE TABLE IF NOT EXISTS ensures both cases work without error.

CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    gstin       TEXT,
    address     TEXT,
    ledgr_enabled   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- stores table is already owned by inventory module in combined deployment.
-- Ledgr only reads from it via /api/v1/ledgr/stores.
-- In standalone deployment, Ledgr creates and manages this table.
CREATE TABLE IF NOT EXISTS stores (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    is_primary      INTEGER NOT NULL DEFAULT 0,
    is_active       INTEGER NOT NULL DEFAULT 1,
    metadata_json   TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
