-- 000011_add_ledgr_daylog.up.sql
-- Day completion/lock state machine, audit log, recurring templates,
-- salary sub-details, deductions, and receipt attachments.

CREATE TABLE ledgr_daylog (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id      TEXT NOT NULL,
    date        TEXT NOT NULL,               -- YYYY-MM-DD
    state       TEXT NOT NULL DEFAULT 'draft', -- draft|pending_review|locked
    locked_by   TEXT,                        -- soft ref to users.id
    locked_at   DATETIME,
    notes       TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, date)
);

CREATE INDEX idx_ledgr_daylog_org_date ON ledgr_daylog(org_id, date);

CREATE TABLE ledgr_daylog_audit (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    daylog_id   TEXT NOT NULL,
    from_state  TEXT NOT NULL,
    to_state    TEXT NOT NULL,
    changed_by  TEXT NOT NULL,              -- soft ref to users.id
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- No FK to ledgr_daylog: audit rows are append-only, never cascade-deleted
);

CREATE INDEX idx_ledgr_daylog_audit_daylog ON ledgr_daylog_audit(daylog_id);

CREATE TABLE ledgr_templates (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id          TEXT NOT NULL,
    name            TEXT NOT NULL,
    category_id     TEXT NOT NULL,
    amount_paise    INTEGER,                 -- nullable: amount may vary per use
    funding_source  TEXT NOT NULL,
    payment_method  TEXT NOT NULL,
    gst_rate        TEXT NOT NULL DEFAULT '0',
    gst_inclusive   INTEGER NOT NULL DEFAULT 1,
    store_id        TEXT,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ledgr_templates_org ON ledgr_templates(org_id);

CREATE TABLE ledgr_salary_details (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id      TEXT NOT NULL UNIQUE,
    employee_name   TEXT NOT NULL,
    gross_paise     INTEGER NOT NULL,
    net_paise       INTEGER NOT NULL,        -- equals expense.amount_paise
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES ledgr_expenses(id) ON DELETE CASCADE
);

CREATE TABLE ledgr_salary_deductions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    salary_id       TEXT NOT NULL,
    deduction_type  TEXT NOT NULL,           -- leave|advance|other
    deduction_label TEXT,                    -- free text label for 'other'
    amount_paise    INTEGER NOT NULL,
    FOREIGN KEY (salary_id) REFERENCES ledgr_salary_details(id) ON DELETE CASCADE
);

CREATE TABLE ledgr_attachments (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id  TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_type   TEXT NOT NULL,               -- image|pdf|screenshot
    file_url    TEXT NOT NULL,
    file_size   INTEGER NOT NULL,            -- bytes
    uploaded_by TEXT NOT NULL,              -- soft ref to users.id
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES ledgr_expenses(id) ON DELETE CASCADE
);

CREATE INDEX idx_ledgr_attachments_expense ON ledgr_attachments(expense_id);
