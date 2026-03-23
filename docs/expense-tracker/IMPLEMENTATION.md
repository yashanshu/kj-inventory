# Ledgr — Implementation Specification

> **Version**: 2.0.0
> **Depends on**: PRD.md (requirements), BRAND.md (design)
> **Module boundary**: All code lives in `expense-tracker/` (frontend) and `backend/internal/ledgr/` + `/api/v1/ledgr/` (backend)
>
> **Deployment contract**:
> - The Ledgr frontend (`expense-tracker/`) is **always deployed as a standalone app** at its own origin. It is never bundled with or served by the inventory frontend.
> - The backend is shared — one Go server, one DB — when both modules are active for an org. When deployed without the inventory module, the same Go server runs with only Ledgr routes.
> - The Ledgr frontend owns its own login/auth flow. It shares no runtime code with the inventory frontend.
> - All Ledgr backend code must compile and run correctly whether or not the inventory handlers are present.

---

## 1. Directory Layout

```
kj-inventory/
├── backend/
│   ├── internal/
│   │   └── ledgr/                    ← NEW: isolated module
│   │       ├── domain/
│   │       │   ├── expense.go         ← types, enums, state machine
│   │       │   ├── category.go
│   │       │   ├── partner.go
│   │       │   ├── daylog.go          ← day completion/lock state
│   │       │   ├── template.go        ← recurring expense templates
│   │       │   └── settlement.go
│   │       ├── repository/
│   │       │   ├── interfaces.go
│   │       │   ├── expense_repo.go
│   │       │   ├── category_repo.go
│   │       │   ├── daylog_repo.go
│   │       │   ├── template_repo.go
│   │       │   ├── partner_repo.go
│   │       │   └── expense_repo_test.go
│   │       ├── service/
│   │       │   ├── expense_service.go
│   │       │   ├── gst_service.go      ← GST computation logic
│   │       │   ├── lock_service.go     ← day state machine
│   │       │   ├── report_service.go
│   │       │   └── export_service.go
│   │       └── handlers/
│   │           ├── expense_handler.go
│   │           ├── category_handler.go
│   │           ├── daylog_handler.go
│   │           ├── template_handler.go
│   │           ├── partner_handler.go
│   │           ├── report_handler.go
│   │           └── export_handler.go
│   └── migrations/
│       ├── 000006_add_ledgr_bootstrap.up.sql   ← organizations + stores (IF NOT EXISTS)
│       ├── 000006_add_ledgr_bootstrap.down.sql  ← intentional no-op
│       ├── 000007_add_ledgr_expenses.up.sql
│       ├── 000007_add_ledgr_expenses.down.sql
│       ├── 000008_add_ledgr_categories.up.sql
│       ├── 000008_add_ledgr_categories.down.sql
│       ├── 000009_add_ledgr_daylog.up.sql       ← daylog + audit + templates + salary + attachments
│       └── 000009_add_ledgr_daylog.down.sql
│
└── expense-tracker/                   ← Standalone Vite + React 19 app
    ├── README.md
    ├── .env.example                   ← VITE_API_BASE_URL, VITE_APP_TITLE
    ├── package.json
    ├── vite.config.ts                 ← See §8 for full config
    ├── tsconfig.json
    ├── index.html                     ← Entry; <title>Ledgr</title>
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                    ← Router: public (Login) + protected routes
    │   ├── env.ts                     ← Typed VITE_ env var exports
    │   ├── api/
    │   │   ├── client.ts              ← Axios instance; reads VITE_API_BASE_URL; JWT interceptor
    │   │   ├── auth.ts                ← login(), logout(), getProfile()
    │   │   ├── expenses.ts
    │   │   ├── categories.ts
    │   │   ├── daylog.ts
    │   │   ├── partners.ts
    │   │   ├── reports.ts
    │   │   ├── stores.ts              ← calls /api/v1/ledgr/stores (Ledgr-owned endpoint)
    │   │   └── templates.ts
    │   ├── components/
    │   │   ├── ui/                    ← Primitives (Button, Input, Badge, Card)
    │   │   ├── auth/
    │   │   │   └── ProtectedRoute.tsx ← Redirects to /login if no JWT
    │   │   ├── calendar/
    │   │   │   ├── MonthGrid.tsx      ← The signature calendar component
    │   │   │   ├── DayCell.tsx
    │   │   │   └── DayPanel.tsx
    │   │   ├── expenses/
    │   │   │   ├── QuickAddFab.tsx
    │   │   │   ├── ExpenseForm.tsx
    │   │   │   ├── ExpenseList.tsx
    │   │   │   ├── ExpenseRow.tsx
    │   │   │   ├── SalaryForm.tsx
    │   │   │   └── SettlementForm.tsx
    │   │   ├── reports/
    │   │   │   ├── PLSummary.tsx
    │   │   │   ├── GSTSummary.tsx
    │   │   │   └── PartnerLedger.tsx
    │   │   └── layout/
    │   │       ├── Sidebar.tsx
    │   │       ├── BottomNav.tsx
    │   │       └── AppShell.tsx
    │   ├── hooks/
    │   │   ├── useExpenses.ts
    │   │   ├── useCalendar.ts
    │   │   ├── useDayLog.ts
    │   │   ├── useGST.ts
    │   │   └── usePartners.ts
    │   ├── stores/
    │   │   ├── authStore.ts           ← Full JWT lifecycle: login, persist, refresh, logout
    │   │   └── uiStore.ts
    │   ├── utils/
    │   │   ├── gst.ts                 ← Pure GST math (unit-tested)
    │   │   ├── currency.ts            ← INR formatting, paise conversions
    │   │   └── dates.ts
    │   ├── types/
    │   │   └── ledgr.ts               ← TypeScript types matching Go domain
    │   └── pages/
    │       ├── LoginPage.tsx          ← Standalone login (deep blue gradient hero, left-aligned title, white form sheet sliding up)
    │       ├── DashboardPage.tsx
    │       ├── CalendarPage.tsx
    │       ├── ExpensesPage.tsx
    │       ├── PartnersPage.tsx
    │       ├── ReportsPage.tsx
    │       └── SettingsPage.tsx
    └── tests/
        ├── unit/
        │   ├── gst.test.ts
        │   └── currency.test.ts
        └── e2e/
            ├── quick-add.spec.ts
            └── day-lock.spec.ts
```

---

## 2. Backend — Database Schema

### Migration numbering

> **Important**: Sprint 2 (mobile) reserved `000005` for a simple expenses table. Ledgr supersedes that design on the backend. Migrations `000006`–`000009` are Ledgr's.
> If `000005` was never committed to the migrations directory, skip it. If it was committed, add a `000005_add_expenses.down.sql` that rolls it back before running Ledgr migrations.

### Migration 000006 — ledgr_bootstrap

This migration handles two cases:
1. **Combined deployment** (inventory module present): `organizations` and `stores` tables already exist — the `CREATE TABLE IF NOT EXISTS` and `-- shared` comments indicate Ledgr reads them but did not create them.
2. **Standalone deployment** (no inventory module): Ledgr creates minimal `organizations` and `stores` tables itself.

```sql
-- 000006_add_ledgr_bootstrap.up.sql

-- Organizations table.
-- In combined deployment, this table is already created by the inventory module.
-- In standalone deployment, Ledgr owns and creates this table.
-- Using CREATE TABLE IF NOT EXISTS ensures both cases work without error.
CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    gstin       TEXT,
    address     TEXT,
    ledgr_enabled   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stores table.
-- In combined deployment, this table already exists (owned by inventory module).
-- Ledgr only reads from it via /api/v1/ledgr/stores.
-- In standalone deployment, Ledgr creates this table and manages it via settings.
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

-- Ledgr-specific feature flag column.
-- Only added if not already present (inventory module may not have this column).
-- Handled in application code via orgRepo.IsLedgrEnabled() which checks the column
-- at startup and adds it via ALTER TABLE if missing.
```

```sql
-- 000006_add_ledgr_bootstrap.down.sql
-- Only drops tables if they are Ledgr-only (standalone deployment).
-- In combined deployment, these are inventory-owned — do not drop.
-- Application logic must decide; this down migration is a no-op by design.
SELECT 1; -- intentional no-op
```

### Migration 000007 — ledgr_expenses

```sql
-- 000007_add_ledgr_expenses.up.sql
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
    -- No FOREIGN KEY constraints intentionally: avoids cross-module FK dependency.
    -- Referential integrity enforced at service layer.
);

CREATE INDEX idx_ledgr_expenses_org_date ON ledgr_expenses(org_id, date);
CREATE INDEX idx_ledgr_expenses_category ON ledgr_expenses(org_id, category_id);
CREATE INDEX idx_ledgr_expenses_store ON ledgr_expenses(store_id);
```

> **Why no FKs?** SQLite FK enforcement requires `PRAGMA foreign_keys = ON` per connection. Cross-module FKs (e.g., to `stores`, `users`) create a hard runtime dependency on the inventory schema. Removing FKs at the DB level and enforcing integrity in the service layer gives Ledgr the same correctness guarantees without coupling migrations.

### Migration 000008 — ledgr_categories

```sql
-- 000008_add_ledgr_categories.up.sql
CREATE TABLE ledgr_categories (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_hidden   INTEGER NOT NULL DEFAULT 0,
    is_system   INTEGER NOT NULL DEFAULT 0,   -- system categories not deletable
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, name)
);

-- Seed system categories inserted per org on first setup (application code, not migration)
```

### Migration 000009 — ledgr_daylog, templates, salary, attachments

```sql
-- 000009_add_ledgr_daylog.up.sql

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

CREATE TABLE ledgr_daylog_audit (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    daylog_id   TEXT NOT NULL,
    from_state  TEXT NOT NULL,
    to_state    TEXT NOT NULL,
    changed_by  TEXT NOT NULL,              -- soft ref to users.id
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- No FK to ledgr_daylog: audit rows are append-only, never cascade-deleted
);

CREATE TABLE ledgr_templates (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id          TEXT NOT NULL,
    name            TEXT NOT NULL,
    category_id     TEXT NOT NULL,
    amount_paise    INTEGER,                 -- nullable, may vary
    funding_source  TEXT NOT NULL,
    payment_method  TEXT NOT NULL,
    gst_rate        TEXT NOT NULL DEFAULT '0',
    gst_inclusive   INTEGER NOT NULL DEFAULT 1,
    store_id        TEXT,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ledgr_salary_details (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id      TEXT NOT NULL UNIQUE,
    employee_name   TEXT NOT NULL,
    gross_paise     INTEGER NOT NULL,
    net_paise       INTEGER NOT NULL,        -- = expense amount_paise
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES ledgr_expenses(id) ON DELETE CASCADE
);

CREATE TABLE ledgr_salary_deductions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    salary_id       TEXT NOT NULL,
    deduction_type  TEXT NOT NULL,           -- leave|advance|other
    deduction_label TEXT,                    -- free text for 'other'
    amount_paise    INTEGER NOT NULL,
    FOREIGN KEY (salary_id) REFERENCES ledgr_salary_details(id) ON DELETE CASCADE
);

CREATE TABLE ledgr_attachments (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    expense_id  TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_type   TEXT NOT NULL,               -- image|pdf|screenshot
    file_url    TEXT NOT NULL,
    file_size   INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES ledgr_expenses(id) ON DELETE CASCADE
);
```

---

## 3. Backend — Domain Types (Go)

```go
// backend/internal/ledgr/domain/expense.go

package domain

import "time"

type FundingSource string
const (
    FundingPersonal  FundingSource = "personal"
    FundingPartner2  FundingSource = "partner2"
    FundingPartner3  FundingSource = "partner3"
    FundingPayout    FundingSource = "payout"
    FundingLoan      FundingSource = "loan"
)

type PaymentMethod string
const (
    PaymentUPI   PaymentMethod = "upi"
    PaymentCard  PaymentMethod = "card"
    PaymentCash  PaymentMethod = "cash"
    PaymentNEFT  PaymentMethod = "neft"
    PaymentOther PaymentMethod = "other"
)

type GSTRate string
const (
    GSTRate0  GSTRate = "0"
    GSTRate5  GSTRate = "5"
    GSTRate12 GSTRate = "12"
    GSTRate18 GSTRate = "18"
    GSTRate28 GSTRate = "28"
)

type EntryType string
const (
    EntryExpense    EntryType = "expense"
    EntrySalary     EntryType = "salary"
    EntrySettlement EntryType = "settlement"
)

type Expense struct {
    ID            string        `json:"id"`
    OrgID         string        `json:"org_id"`
    StoreID       *string       `json:"store_id,omitempty"`
    Date          string        `json:"date"`          // YYYY-MM-DD
    AmountPaise   int64         `json:"amount_paise"`  // gross
    BasePaise     int64         `json:"base_paise"`    // pre-GST
    GSTRate       GSTRate       `json:"gst_rate"`
    CGSTPaise     int64         `json:"cgst_paise"`
    SGSTPaise     int64         `json:"sgst_paise"`
    IGSTPaise     int64         `json:"igst_paise"`
    GSTInclusive  bool          `json:"gst_inclusive"`
    IsInterstate  bool          `json:"is_interstate"`
    CategoryID    string        `json:"category_id"`
    FundingSource FundingSource `json:"funding_source"`
    PaymentMethod PaymentMethod `json:"payment_method"`
    VendorName    *string       `json:"vendor_name,omitempty"`
    VendorGSTIN   *string       `json:"vendor_gstin,omitempty"`
    InvoiceNumber *string       `json:"invoice_number,omitempty"`
    HasInvoice    bool          `json:"has_invoice"`
    EntryType     EntryType     `json:"entry_type"`
    Description   *string       `json:"description,omitempty"`
    CreatedBy     string        `json:"created_by"`
    CreatedAt     time.Time     `json:"created_at"`
    UpdatedAt     time.Time     `json:"updated_at"`
}
```

```go
// backend/internal/ledgr/domain/daylog.go

package domain

type DayState string
const (
    DayStateDraft         DayState = "draft"
    DayStatePendingReview DayState = "pending_review"
    DayStateLocked        DayState = "locked"
)

// ValidTransitions defines allowed state machine transitions.
// Key: fromState, Value: allowed toStates
var ValidTransitions = map[DayState][]DayState{
    DayStateDraft:         {DayStatePendingReview},
    DayStatePendingReview: {DayStateLocked, DayStateDraft},
    DayStateLocked:        {DayStateDraft}, // admin-only unlock
}

func (d DayState) CanTransitionTo(next DayState, isAdmin bool) bool {
    if d == DayStateLocked && !isAdmin {
        return false
    }
    allowed := ValidTransitions[d]
    for _, s := range allowed {
        if s == next {
            return true
        }
    }
    return false
}
```

---

## 4. Backend — API Routes

All routes under `/api/v1/ledgr/`. Routes are always registered in the router. The `LedgrFeatureGuard` middleware checks the `ledgr_enabled` flag per org at request time and returns `403` if disabled — this allows hot-toggling without server restart.

```
POST   /api/v1/ledgr/expenses                  Create expense
GET    /api/v1/ledgr/expenses                  List expenses (filters: date_from, date_to, category_id, funding_source, payment_method, store_id, entry_type, page, per_page)
GET    /api/v1/ledgr/expenses/:id              Get expense
PUT    /api/v1/ledgr/expenses/:id              Update expense (blocked if day locked)
DELETE /api/v1/ledgr/expenses/:id              Delete expense (blocked if day locked)

GET    /api/v1/ledgr/expenses/calendar/:year/:month   Calendar summary (day states + totals)

POST   /api/v1/ledgr/categories                Create category (admin)
GET    /api/v1/ledgr/categories                List categories
PUT    /api/v1/ledgr/categories/:id            Update category (admin)
DELETE /api/v1/ledgr/categories/:id            Delete category (admin, non-system only)

GET    /api/v1/ledgr/daylog/:date              Get day state
POST   /api/v1/ledgr/daylog/:date/submit       Mark as done → pending_review
POST   /api/v1/ledgr/daylog/:date/lock         Lock day (admin)
POST   /api/v1/ledgr/daylog/:date/unlock       Unlock day (admin)

GET    /api/v1/ledgr/templates                 List templates
POST   /api/v1/ledgr/templates                 Create template (admin)
PUT    /api/v1/ledgr/templates/:id             Update template (admin)
DELETE /api/v1/ledgr/templates/:id             Delete template (admin)

GET    /api/v1/ledgr/partners/balances         Partner balance ledger
POST   /api/v1/ledgr/settlements               Create settlement entry

GET    /api/v1/ledgr/reports/pl                P&L summary (query: from, to)
GET    /api/v1/ledgr/reports/gst               GST summary (query: from, to)
GET    /api/v1/ledgr/reports/partners          Partner report

GET    /api/v1/ledgr/exports/csv               CSV export (same filters as list)
GET    /api/v1/ledgr/exports/pdf               PDF export

GET    /api/v1/ledgr/stores                    List stores for org (Ledgr-owned read; works in both combined and standalone)

POST   /api/v1/ledgr/attachments               Upload attachment (multipart/form-data; field: file, expense_id)
GET    /api/v1/ledgr/attachments/:id           Get attachment metadata
DELETE /api/v1/ledgr/attachments/:id           Delete attachment (blocked if day locked)
```

### Calendar summary response shape

```json
{
  "year": 2026,
  "month": 3,
  "days": [
    {
      "date": "2026-03-01",
      "state": "locked",
      "entry_count": 4,
      "total_paise": 245000,
      "base_paise": 207627,
      "gst_paise": 37373
    }
  ],
  "week_totals": [...],
  "month_total_paise": 1245000
}
```

---

## 5. GST Computation Logic

Canonical implementation lives in `utils/gst.ts` (frontend) and `service/gst_service.go` (backend). Both must agree. Unit tests cover all cases.

```typescript
// expense-tracker/src/utils/gst.ts

export type GSTRate = 0 | 5 | 12 | 18 | 28;

export interface GSTResult {
  basePaise: number;    // pre-GST amount
  gstPaise: number;     // total GST
  cgstPaise: number;    // 0 if interstate
  sgstPaise: number;    // 0 if interstate
  igstPaise: number;    // 0 if intrastate
  totalPaise: number;   // gross amount
}

export function computeGST(
  amountPaise: number,
  rate: GSTRate,
  inclusive: boolean,
  interstate: boolean
): GSTResult {
  if (rate === 0) {
    return { basePaise: amountPaise, gstPaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, totalPaise: amountPaise };
  }

  let basePaise: number;
  let gstPaise: number;

  if (inclusive) {
    // Amount includes GST: base = amount * 100 / (100 + rate)
    basePaise = Math.round(amountPaise * 100 / (100 + rate));
    gstPaise = amountPaise - basePaise;
  } else {
    // Amount excludes GST: gst = amount * rate / 100
    basePaise = amountPaise;
    gstPaise = Math.round(amountPaise * rate / 100);
  }

  const totalPaise = inclusive ? amountPaise : basePaise + gstPaise;

  let cgstPaise = 0, sgstPaise = 0, igstPaise = 0;
  if (interstate) {
    igstPaise = gstPaise;
  } else {
    cgstPaise = Math.round(gstPaise / 2);
    sgstPaise = gstPaise - cgstPaise; // absorbs rounding
  }

  return { basePaise, gstPaise, cgstPaise, sgstPaise, igstPaise, totalPaise };
}
```

---

## 6. Feature Flag Integration & Context Helpers

### Context helpers (self-contained in ledgr package)

Ledgr does **not** import from `backend/internal/middleware`. It defines its own typed context accessors. The upstream `AuthMiddleware` in `backend/internal/middleware/auth.go` stores values using raw string keys. Ledgr reads those same string keys but wraps them in typed helpers within its own package — no import dependency.

```go
// backend/internal/ledgr/handlers/context.go

package handlers

import (
    "context"
    "net/http"
)

// These key names must match what backend/internal/middleware/auth.go stores.
// They are string constants, not imported symbols — no package dependency.
const (
    ctxKeyUserID   = "user_id"
    ctxKeyOrgID    = "organization_id"
    ctxKeyRole     = "role"
)

func orgIDFromContext(ctx context.Context) string {
    v, _ := ctx.Value(ctxKeyOrgID).(string)
    return v
}

func userIDFromContext(ctx context.Context) string {
    v, _ := ctx.Value(ctxKeyUserID).(string)
    return v
}

func roleFromContext(ctx context.Context) string {
    v, _ := ctx.Value(ctxKeyRole).(string)
    return v
}

func isAdmin(r *http.Request) bool {
    return roleFromContext(r.Context()) == "admin"
}
```

### Feature flag guard

```go
// backend/internal/ledgr/handlers/guard.go

package handlers

import (
    "encoding/json"
    "net/http"
)

type OrgRepository interface {
    IsLedgrEnabled(orgID string) (bool, error)
}

func LedgrFeatureGuard(orgRepo OrgRepository) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            orgID := orgIDFromContext(r.Context())
            if orgID == "" {
                respondError(w, http.StatusUnauthorized, "missing organization context")
                return
            }
            enabled, err := orgRepo.IsLedgrEnabled(orgID)
            if err != nil || !enabled {
                respondError(w, http.StatusForbidden, "ledgr module not enabled for this organization")
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

func respondError(w http.ResponseWriter, status int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]string{"error": message})
}
```

### Feature flag storage

The `organizations` table gains a `ledgr_enabled` column (added by migration 000006 via `CREATE TABLE IF NOT EXISTS`). For combined deployments where the inventory module already created the `organizations` table without this column, the application adds it at startup:

```go
// backend/internal/ledgr/repository/org_repo.go

func (r *OrgRepository) EnsureLedgrColumn(db *sql.DB) error {
    _, err := db.Exec(`ALTER TABLE organizations ADD COLUMN ledgr_enabled INTEGER NOT NULL DEFAULT 0`)
    if err != nil && !strings.Contains(err.Error(), "duplicate column") {
        return err
    }
    return nil // column already exists — no-op
}
```

Call `EnsureLedgrColumn` once at server startup, before route registration. This is safe and idempotent.

---

## 7. Module Integration in main.go

The Ledgr module is always compiled into the same binary as the inventory module (one Go server). The feature flag controls whether a given org can use it at runtime.

```go
// backend/cmd/server/main.go — Ledgr additions

// 1. Ensure ledgr_enabled column exists (idempotent, safe for combined deployment)
ledgrOrgRepo := ledgr_repo.NewOrgRepository(db)
if err := ledgrOrgRepo.EnsureLedgrColumn(db); err != nil {
    log.Fatal("Failed to ensure ledgr column", err)
}

// 2. Initialize Ledgr repositories
ledgrExpenseRepo    := ledgr_repo.NewExpenseRepository(db)
ledgrCategoryRepo   := ledgr_repo.NewCategoryRepository(db)
ledgrDaylogRepo     := ledgr_repo.NewDaylogRepository(db)
ledgrTemplateRepo   := ledgr_repo.NewTemplateRepository(db)
ledgrPartnerRepo    := ledgr_repo.NewPartnerRepository(db)
ledgrStoreRepo      := ledgr_repo.NewStoreRepository(db)      // reads shared stores table
ledgrAttachmentRepo := ledgr_repo.NewAttachmentRepository(db)

// 3. Initialize Ledgr services
ledgrExpenseService    := ledgr_service.NewExpenseService(ledgrExpenseRepo, ledgrCategoryRepo, ledgrDaylogRepo)
ledgrLockService       := ledgr_service.NewLockService(ledgrDaylogRepo)
ledgrReportService     := ledgr_service.NewReportService(ledgrExpenseRepo)
ledgrExportService     := ledgr_service.NewExportService(ledgrExpenseRepo)
ledgrAttachmentService := ledgr_service.NewAttachmentService(ledgrAttachmentRepo, cfg.Ledgr.AttachmentDir)

// 4. Initialize Ledgr handlers
ledgrExpenseHandler    := ledgr_handlers.NewExpenseHandler(ledgrExpenseService, log)
ledgrCategoryHandler   := ledgr_handlers.NewCategoryHandler(ledgrCategoryRepo, log)
ledgrDaylogHandler     := ledgr_handlers.NewDaylogHandler(ledgrLockService, log)
ledgrTemplateHandler   := ledgr_handlers.NewTemplateHandler(ledgrTemplateRepo, log)
ledgrPartnerHandler    := ledgr_handlers.NewPartnerHandler(ledgrPartnerRepo, ledgrExpenseRepo, log)
ledgrReportHandler     := ledgr_handlers.NewReportHandler(ledgrReportService, log)
ledgrExportHandler     := ledgr_handlers.NewExportHandler(ledgrExportService, log)
ledgrStoreHandler      := ledgr_handlers.NewStoreHandler(ledgrStoreRepo, log)
ledgrAttachmentHandler := ledgr_handlers.NewAttachmentHandler(ledgrAttachmentService, log)

// 5. Mount Ledgr routes inside the JWT-protected group
// The feature guard checks ledgr_enabled per org at request time.
r.Route("/api/v1/ledgr", func(r chi.Router) {
    r.Use(middleware.AuthMiddleware(cfg.JWT.Secret))
    r.Use(ledgr_handlers.LedgrFeatureGuard(ledgrOrgRepo))

    r.Get("/stores", ledgrStoreHandler.List)

    r.Post("/expenses", ledgrExpenseHandler.Create)
    r.Get("/expenses", ledgrExpenseHandler.List)
    r.Get("/expenses/{id}", ledgrExpenseHandler.Get)
    r.Put("/expenses/{id}", ledgrExpenseHandler.Update)
    r.Delete("/expenses/{id}", ledgrExpenseHandler.Delete)
    r.Get("/expenses/calendar/{year}/{month}", ledgrExpenseHandler.CalendarSummary)

    r.Post("/categories", ledgrCategoryHandler.Create)
    r.Get("/categories", ledgrCategoryHandler.List)
    r.Put("/categories/{id}", ledgrCategoryHandler.Update)
    r.Delete("/categories/{id}", ledgrCategoryHandler.Delete)

    r.Get("/daylog/{date}", ledgrDaylogHandler.Get)
    r.Post("/daylog/{date}/submit", ledgrDaylogHandler.Submit)
    r.Post("/daylog/{date}/lock", ledgrDaylogHandler.Lock)
    r.Post("/daylog/{date}/unlock", ledgrDaylogHandler.Unlock)

    r.Get("/templates", ledgrTemplateHandler.List)
    r.Post("/templates", ledgrTemplateHandler.Create)
    r.Put("/templates/{id}", ledgrTemplateHandler.Update)
    r.Delete("/templates/{id}", ledgrTemplateHandler.Delete)

    r.Get("/partners/balances", ledgrPartnerHandler.Balances)
    r.Post("/settlements", ledgrPartnerHandler.CreateSettlement)

    r.Get("/reports/pl", ledgrReportHandler.PL)
    r.Get("/reports/gst", ledgrReportHandler.GST)
    r.Get("/reports/partners", ledgrReportHandler.Partners)

    r.Get("/exports/csv", ledgrExportHandler.CSV)
    r.Get("/exports/pdf", ledgrExportHandler.PDF)

    r.Post("/attachments", ledgrAttachmentHandler.Upload)
    r.Get("/attachments/{id}", ledgrAttachmentHandler.Get)
    r.Delete("/attachments/{id}", ledgrAttachmentHandler.Delete)
})
```

### Config additions

Add to `backend/internal/config/config.go`:

```go
type LedgrCfg struct {
    AttachmentDir     string // local disk path for uploaded files
    AttachmentMaxSize int64  // max bytes per file (default 10MB)
}

// In Config struct:
Ledgr LedgrCfg

// In Load():
cfg.Ledgr = LedgrCfg{
    AttachmentDir:     getEnv("LEDGR_ATTACHMENT_DIR", "./data/attachments"),
    AttachmentMaxSize: int64(getEnvAsInt("LEDGR_ATTACHMENT_MAX_SIZE_MB", 10)) * 1024 * 1024,
}
```

---

## 8. Frontend — Standalone App Configuration

### vite.config.ts

```typescript
// expense-tracker/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5174, // distinct from inventory frontend (5173)
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8888',
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
```

### .env.example

```
# Base URL of the Go API server (no trailing slash)
VITE_API_BASE_URL=http://localhost:8888

# Optional: if served under a subpath (e.g. /ledgr), set here
VITE_BASE_PATH=/

# App display title
VITE_APP_TITLE=Ledgr
```

### env.ts — typed env exports

```typescript
// expense-tracker/src/env.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string || '';
export const APP_TITLE    = import.meta.env.VITE_APP_TITLE as string || 'Ledgr';
```

### api/client.ts — Axios instance with JWT lifecycle

```typescript
// expense-tracker/src/api/client.ts
import axios from 'axios';
import { API_BASE_URL } from '../env';
import { useAuthStore } from '../stores/authStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear auth and redirect to login
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
```

### authStore.ts — full JWT lifecycle

```typescript
// expense-tracker/src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; orgId: string; role: string } | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'ledgr-auth' } // persisted in localStorage, key isolated from inventory app
  )
);
```

### api/auth.ts

```typescript
// expense-tracker/src/api/auth.ts
import { apiClient } from './client';

export async function login(email: string, password: string) {
  const res = await apiClient.post('/api/v1/auth/login', { email, password });
  return res.data as { token: string; user: { id: string; email: string; organization_id: string; role: string } };
}
```

### stores endpoint — no cross-module dependency

```typescript
// expense-tracker/src/api/stores.ts
import { apiClient } from './client';

// Calls /api/v1/ledgr/stores — a Ledgr-owned endpoint.
// In combined deployment: returns stores from the shared stores table filtered by org.
// In standalone deployment: returns stores from the same table, created/managed via Ledgr settings.
export async function listStores() {
  const res = await apiClient.get('/api/v1/ledgr/stores');
  return res.data as { id: string; name: string; code: string; is_primary: boolean }[];
}
```

### Deployment — how to serve

Ledgr is never served by the inventory Go server's static file handler (which serves `./frontend/dist`). Two options:

**Option A — Reverse proxy (recommended for production)**
Nginx/Caddy routes:
```
/api/*     → Go server :8888
/*         → expense-tracker/dist (served as static files by nginx)
```
CORS: `CORS_ALLOWED_ORIGINS` on the Go server must include the Ledgr origin.

**Option B — Separate port (development)**
Go server: `:8888` (API only, `SERVE_STATIC=false` or only serves inventory)
Vite dev server: `:5174` (proxies `/api` to `:8888`)

**What NOT to do**: Do not add a second static handler in `main.go` for Ledgr's dist. The frontend is independently deployed — the Go server is API-only from Ledgr's perspective.

---

## 9. Frontend — Key Component Specs

### MonthGrid.tsx

Props:
```typescript
interface MonthGridProps {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
  weekTotals: WeekTotal[];
  monthTotal: number; // paise
  onDayClick: (date: string) => void;
}
```

Renders: 7-column CSS grid. Each cell is a `DayCell`. Week totals in an 8th column. Month total in footer row.

### DayCell.tsx

Derives visual state from `CalendarDay.state` (Architectural Ledger tonal system):
- `locked` → sage green tint (`rgba(197,236,204,0.35)`) + 🔒 emoji top-right, text `--tertiary`
- `pending_review` → amber tint (`rgba(230,185,107,0.2)`) + amber dot top-right, text `#92400e`
- `has_entries` → blue tint (`rgba(219,225,255,0.6)`), text `--primary`
- `empty` → `--surface-container-low`, text `--on-surface-variant`
- `future` → opacity 0.38, non-interactive
- `today` → blue tint + `outline: 2px solid var(--primary)`

No borders on cells — tonal backgrounds only. Cell radius: 8px.

### QuickAddFab.tsx

Fixed position bottom-right (mobile) / toolbar button (desktop). Opens bottom sheet (mobile) or modal (desktop) with 5-field quick form. Remembers last used category + funding source in `localStorage`.

### ExpenseForm.tsx

- Default: 5 fields visible (amount, category, funding, payment method, date)
- "More details" disclosure: vendor, GSTIN, invoice, GST rate/inclusive toggle, store, attachments, notes
- GST section: rate picker (0/5/12/18/28), inclusive toggle, IGST toggle; computed fields shown as read-only preview
- Amount input: custom numeric input with INR prefix on mobile

---

## 10. Testing Requirements

### Backend

```
backend/internal/ledgr/
├── domain/expense_test.go              ← state machine, validation
├── service/gst_service_test.go         ← all GST rate/inclusive/interstate combos
├── service/lock_service_test.go        ← state transitions, admin guard
├── repository/expense_repo_test.go     ← integration test against SQLite
├── repository/org_repo_test.go         ← EnsureLedgrColumn idempotency
└── handlers/expense_handler_test.go    ← HTTP handler tests
```

Minimum coverage: 80% on service and domain packages.

### Frontend

```
expense-tracker/tests/
├── unit/gst.test.ts             ← computeGST for all combinations (20+ cases)
├── unit/currency.test.ts        ← paise formatting
└── e2e/
    ├── login.spec.ts            ← standalone login flow (no shared auth)
    ├── quick-add.spec.ts        ← add expense, verify in calendar
    └── day-lock.spec.ts         ← mark done, lock, edit attempt blocked
```

> E2E tests must configure `VITE_API_BASE_URL` to point at a test server. They must NOT depend on the inventory frontend or any inventory test fixtures.

---

## 11. Extension Points

These are deliberately left as interfaces for v1.1+:

| Extension | Interface | Notes |
|---|---|---|
| Bank import | `ExpenseImporter` interface in service layer | CSV/OFX adapter plugs in |
| OCR receipts | `AttachmentProcessor` interface | Fires async after upload |
| GST e-filing | `GSTExporter` interface | GSTR-1 JSON format adapter |
| Accounting sync | `AccountingAdapter` interface | Tally/Zoho adapter |
| Webhook | `EventPublisher` interface | Fires on lock, on create |

---

## 12. Responsibilities (What owns what)

| Layer | Owns | Does NOT own |
|---|---|---|
| Domain | Types, enums, state machine rules | DB queries, HTTP |
| Repository | DB queries, migrations | Business logic |
| Service | Business logic, GST math, lock enforcement | HTTP transport |
| Handler | HTTP request/response, auth context | Business logic |
| Frontend `utils/` | Pure computation (GST, currency) | API calls, state |
| Frontend `api/` | API calls, query keys | UI rendering |
| Frontend `hooks/` | React Query + state wiring | Pure computation |
| Frontend `components/` | Rendering | Business logic |

---

## 13. Implementation Order (Recommended)

1. **Migration 000006** — `EnsureLedgrColumn`, verify bootstrap runs cleanly on both a fresh DB and a DB with existing inventory schema
2. **Migrations 000007–000009** — run, verify schema (no FKs to verify, check indexes)
3. **Domain types** — expense.go, daylog.go (state machine), org_repo.go
4. **Context helpers** — context.go, guard.go (self-contained, no middleware import)
5. **Repository layer** — expense_repo, daylog_repo, store_repo, org_repo (with tests)
6. **GST service** — gst_service.go (with tests against all rate/inclusive/interstate combos)
7. **Lock service** — lock_service.go (state machine enforcement + admin guard)
8. **Expense service** — orchestrates repo + gst + lock
9. **Attachment service** — local disk, max size enforcement, path sanitization
10. **Handlers + routes** — wire to main.go per §7
11. **Frontend: env.ts + vite.config.ts** — standalone config, proxy, base path
12. **Frontend: authStore + api/auth.ts + LoginPage** — standalone login flow
13. **Frontend: api/client.ts** — JWT interceptor, 401 redirect
14. **Frontend: utils** — gst.ts, currency.ts (with tests)
15. **Frontend: api/ modules** — typed wrappers per endpoint
16. **Calendar component** — MonthGrid + DayCell
17. **Quick Add FAB + form** — highest-priority UX
18. **Day panel** — day detail + lock actions
19. **Expense list + filters**
20. **Reports + exports**
21. **Partner ledger**
22. **Settings** — including store management for standalone
23. **E2E tests** — login flow first, then quick-add, then day-lock

---

## 14. Deployment Scenarios

This section defines the two supported deployment configurations. Both must work without code changes — only env vars differ.

### Scenario A — Standalone (Ledgr only)

```
┌─────────────────────────────┐
│  expense-tracker/dist       │  ← served by nginx / CDN
│  (Ledgr SPA)                │     at ledgr.example.com
└──────────┬──────────────────┘
           │ /api/v1/ledgr/*  (CORS allowed)
┌──────────▼──────────────────┐
│  Go server :8888            │
│  - /api/v1/auth/*           │  ← shared auth (same JWT secret)
│  - /api/v1/ledgr/*          │
│  - inventory routes: absent │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│  SQLite / PostgreSQL         │
│  organizations               │  ← created by migration 000006
│  stores                      │  ← created by migration 000006
│  users                       │
│  ledgr_*                     │
└─────────────────────────────┘
```

Env vars:
```
SERVE_STATIC=false
CORS_ALLOWED_ORIGINS=https://ledgr.example.com
LEDGR_ATTACHMENT_DIR=/var/data/ledgr/attachments
```

### Scenario B — Combined (inventory org also uses Ledgr)

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  frontend/dist              │    │  expense-tracker/dist       │
│  (Inventory SPA)            │    │  (Ledgr SPA)                │
│  app.example.com            │    │  ledgr.example.com          │
└──────────┬──────────────────┘    └──────────┬──────────────────┘
           │                                   │
           │ /api/v1/items/*                   │ /api/v1/ledgr/*
           │ /api/v1/orders/*                  │ /api/v1/auth/*
           └──────────────┬────────────────────┘
                          │ (same origin — both point to the Go server)
           ┌──────────────▼────────────────────┐
           │  Go server :8888                   │
           │  - /api/v1/auth/*                  │
           │  - /api/v1/items|orders|.../*      │  ← inventory routes
           │  - /api/v1/ledgr/*                 │  ← ledgr routes
           │  - SERVE_STATIC=true (inventory)   │
           └──────────────┬────────────────────┘
                          │
           ┌──────────────▼────────────────────┐
           │  SQLite / PostgreSQL                │
           │  organizations  ← inventory-owned  │
           │  stores         ← inventory-owned  │
           │  users          ← inventory-owned  │
           │  items, orders, movements, menus   │
           │  ledgr_*        ← ledgr-owned      │
           └───────────────────────────────────┘
```

Env vars:
```
SERVE_STATIC=true                              # serves inventory frontend
CORS_ALLOWED_ORIGINS=https://app.example.com,https://ledgr.example.com
LEDGR_ATTACHMENT_DIR=/var/data/ledgr/attachments
```

Key behaviour differences between scenarios:
| | Standalone | Combined |
|---|---|---|
| `organizations` table | Created by migration 000006 | Already exists; `EnsureLedgrColumn` adds `ledgr_enabled` |
| `stores` table | Created by migration 000006 | Already exists; Ledgr reads it |
| `SERVE_STATIC` | `false` | `true` (serves inventory SPA) |
| Ledgr frontend origin | Separate domain | Separate domain (always) |
| JWT secret | Own value | Shared with inventory |
| Feature flag | `ledgr_enabled=1` per org | `ledgr_enabled=1` per org (toggled via settings) |
