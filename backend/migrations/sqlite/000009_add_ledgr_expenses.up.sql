-- 000009_add_ledgr_expenses.up.sql

CREATE TABLE ledgr_expenses (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id          TEXT NOT NULL,              -- soft ref to organizations.id
    store_id        TEXT,                       -- soft ref to stores.id; nullable
    date            TEXT NOT NULL,              -- ISO 8601 date: YYYY-MM-DD
    amount_paise    INTEGER NOT NULL,           -- gross amount in paise
    base_paise      INTEGER NOT NULL,           -- pre-GST amount in paise
    gst_rate        TEXT NOT NULL DEFAULT '0',  -- '0','5','12','18','28'
    cgst_paise      INTEGER NOT NULL DEFAULT 0,
    sgst_paise      INTEGER NOT NULL DEFAULT 0,
    igst_paise      INTEGER NOT NULL DEFAULT 0,
    gst_inclusive   INTEGER NOT NULL DEFAULT 1, -- 1=inclusive, 0=exclusive
    is_interstate   INTEGER NOT NULL DEFAULT 0, -- 1=IGST, 0=CGST+SGST
    category_id     TEXT NOT NULL,              -- soft ref to ledgr_categories.id
    funding_source  TEXT NOT NULL,              -- personal|partner2|partner3|payout|loan
    payment_method  TEXT NOT NULL,              -- upi|card|cash|neft|other
    vendor_name     TEXT,
    vendor_gstin    TEXT,
    invoice_number  TEXT,
    has_invoice     INTEGER NOT NULL DEFAULT 0,
    entry_type      TEXT NOT NULL DEFAULT 'expense', -- expense|salary|settlement
    description     TEXT,
    created_by      TEXT NOT NULL,              -- soft ref to users.id
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- No FOREIGN KEY constraints: avoids cross-module FK dependency.
    -- Referential integrity enforced at service layer.
);

CREATE INDEX idx_ledgr_expenses_org_date     ON ledgr_expenses(org_id, date);
CREATE INDEX idx_ledgr_expenses_category     ON ledgr_expenses(org_id, category_id);
CREATE INDEX idx_ledgr_expenses_store        ON ledgr_expenses(store_id);
CREATE INDEX idx_ledgr_expenses_entry_type   ON ledgr_expenses(org_id, entry_type);
