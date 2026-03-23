# Ledgr — Product Requirements Document

> **Version**: 1.2.0
> **Status**: Active — UI implemented
> **Design system**: "The Architectural Ledger" v2 (Manrope, Material You tonal surfaces). See BRAND.md §2.
> **Module**: `expense-tracker` (feature-flagged, organization-scoped)
> **Target users**: MSME owners, restaurant operators, CA/accountant consumers of exports
> **Primary interface**: Mobile-first web app (React/Vite), **always deployed as a standalone frontend** at its own origin. Future Flutter app shares the same design system.
>
> **Deployment model**: Ledgr frontend is always independent. The backend is shared with the inventory module when both are active for an organization — same Go server, same DB, same JWT auth. Organizations can run Ledgr alone, inventory alone, or both. The frontend apps never share code at runtime.

---

## 1. Problem Statement

Restaurant and MSME owners lose financial accuracy not because they don't want to track expenses — but because the act of logging is too slow and interruptible. A UPI payment done in a hurry goes unlogged. A paper receipt gets pocketed and forgotten. By month-end, the books are partially reconstructed from memory and screenshots, producing inaccurate GST filings and no real view of business health.

**Ledgr** solves this by making each individual log entry as fast as a UPI confirmation screen — and by making the month-view so clear that the owner can see at a glance exactly which days still need attention, without re-reading every entry.

---

## 2. Scope & Module Boundary

### In scope (v1.0)
- Expense logging with GST decomposition
- Multi-source funding (personal, partner2, partner3, payout, loan)
- Multi-payment method (UPI, card, cash, NEFT, other)
- Calendar grid month-view with day-level completion status
- Two-phase day locking (entries done → reviewed & locked)
- Admin-only unlock
- Recurring expense templates
- Salary logging with variable deductions (leave, advance)
- Partner balance ledger (who is owed what)
- Reports: P&L summary, GST summary (GSTR-1/3B ready), partner settlement
- Exports: PDF and CSV, CA-ready
- Restaurant-level tagging (expenses can be scoped to a specific store)
- Organization-level feature flag (on/off per org)
- Receipt attachment: photo, PDF, screenshot (stored, not OCR'd in v1)

### Out of scope (v1.0)
- Auto-import from bank statements
- OCR / auto-extraction from receipts
- Payroll system (salary is logged manually as an expense)
- Accounting integrations (Tally, Zoho Books, QuickBooks)
- Multi-currency
- Invoice generation / GST e-filing (exports feed into existing tools)
- Mobile native app (Flutter — same design, separate sprint)

---

## 3. Users & Roles

| Role | Who | Capabilities |
|---|---|---|
| **Admin** | Business owner | Full access: log, review, lock, unlock, manage partners, export, settings |
| **Partner** | Co-owner (partner2, partner3) | Log expenses (own funding source), view shared dashboard, cannot lock/unlock |
| **Viewer** | CA, accountant | Read-only: reports, exports |

All roles are organization-scoped. A user may be Admin in org A and Partner in org B.

---

## 4. Functional Requirements

### 4.1 Expense Entry — Core

**FR-EXP-01** — Quick Add
A new expense can be created in ≤5 taps/clicks:
1. Amount
2. Category
3. Funding source
4. Payment method
5. Save

Date defaults to today. All other fields are optional at entry time and can be filled later.

**FR-EXP-02** — Full Entry Form
Extended fields available (expandable, not shown by default):
- Description / note
- Vendor / payee name
- GST Number of vendor (optional)
- GST rate (0%, 5%, 12%, 18%, 28%)
- GST amount (auto-computed from rate × base amount, or manual override)
- CGST / SGST / IGST split (auto when GST rate set; toggle for IGST if interstate)
- Restaurant/store tag (dropdown from existing stores)
- Receipt attachment (photo, PDF, screenshot; max 5 files per entry)
- Invoice number (optional)
- Mark as has-invoice / no-invoice

**FR-EXP-03** — Amount Entry
- Number pad input on mobile (no keyboard)
- Amount always in INR
- Decimal supported (paise level)
- GST amount shown in real-time as rate is selected

**FR-EXP-04** — Categories
Pre-seeded MSME-relevant categories. Admin can add/rename/reorder.

Default categories:
- Raw Materials
- Packaging
- Electricity & Utilities
- Rent
- Labour / Salary
- Fuel & Transport
- Platform Commissions
- Repairs & Maintenance
- Marketing & Promotions
- Taxes & Government Fees
- Software & Subscriptions
- Miscellaneous

**FR-EXP-05** — Funding Source
Fixed enum (configurable labels, not addable in v1):
- Personal (admin's personal funds)
- Partner 2
- Partner 3
- Payout (restaurant payout / business account)
- Loan

**FR-EXP-06** — Payment Method
- UPI
- Credit/Debit Card
- Cash
- NEFT / Bank Transfer
- Other

### 4.2 Salary Logging

**FR-SAL-01** — Salary is logged as an expense in the "Labour / Salary" category.

**FR-SAL-02** — Salary entry has an extended sub-form:
- Employee name
- Gross salary (base)
- Deductions (repeatable rows):
  - Type: Leave | Advance Recovery | Other
  - Amount
- Net payable (auto-computed: gross − Σ deductions)
- Payment method
- Funding source

**FR-SAL-03** — Salary entries appear in the expense list like any other entry but are visually tagged with a "Salary" pill.

### 4.3 Recurring Expenses

**FR-REC-01** — An expense entry can be saved as a template (name, category, amount, funding source, payment method, GST rate, store tag).

**FR-REC-02** — Templates appear in a "Quick Entry" section in the Quick Add flow.

**FR-REC-03** — Using a template pre-fills all template fields. User adjusts amount if needed and saves. Not auto-debit.

**FR-REC-04** — Admin can manage (add, edit, delete) templates from Settings.

### 4.4 Calendar Month View

**FR-CAL-01** — Default view is the current month in a 7-column grid.

**FR-CAL-02** — Each day cell shows:
- Date number (top-left)
- Visual state via tonal background (see BRAND.md §6 for exact tonal colors — no borders)
- Total amount (bottom-left, caption size) when entry_count > 0
- State indicator: 🔒 emoji (locked) or amber dot (pending_review)

**FR-CAL-03** — Day states (in priority order, highest wins):
1. **Locked** — approved + admin-locked. Shows lock icon.
2. **Pending Review** — entries marked done, awaiting review.
3. **Has Entries** — entries exist, not yet marked done.
4. **Empty** — no entries for this date.
5. **Future** — greyed out, non-interactive.

**FR-CAL-04** — Tapping a day cell opens that day's entry list (slide-up sheet on mobile, side panel on desktop).

**FR-CAL-05** — From the day panel, user can:
- Add a new entry for that date
- Edit/delete any entry (if day not locked)
- Mark day as "Entries Done" → transitions to Pending Review state
- See day total (gross, net of GST, GST amount)

**FR-CAL-06** — Admin can "Approve & Lock" a day that is in Pending Review state. This is done from the day panel.

**FR-CAL-07** — Admin can unlock a locked day. Requires confirmation dialog ("This will re-open day for editing. Continue?").

**FR-CAL-08** — Month navigation: left/right arrows for prev/next month. Month/year picker for jump.

**FR-CAL-09** — Week subtotals shown in a right-hand column. Month total shown in footer.

### 4.5 Expense List View

**FR-LIST-01** — Linear list of all entries for a date range (default: current month).

**FR-LIST-02** — Filters:
- Date range
- Category (multi-select)
- Funding source (multi-select)
- Payment method (multi-select)
- Store/restaurant
- Has invoice / no invoice
- GST rate

**FR-LIST-03** — Sort by: date (default), amount, category.

**FR-LIST-04** — Inline edit: tap an entry → full edit form slides up.

**FR-LIST-05** — Swipe-to-delete on mobile (with undo snackbar, 5 sec). Keyboard delete on desktop.

**FR-LIST-06** — Locked entries show padlock icon. Edit/delete disabled. Attempting shows "Day is locked — contact admin to unlock."

### 4.6 Partner Balance Ledger

**FR-BAL-01** — Track who is owed what across all partners.

**FR-BAL-02** — Every expense logged with a personal funding source (Personal, Partner 2, Partner 3) creates a running balance for that person:
- If payout reimburses → entry with funding source = Payout reduces the balance.
- If partner pays themselves back from payout → recorded as a settlement.

**FR-BAL-03** — Partner Balance screen shows:
- Per-partner: total spent, total settled, net owed to them
- Transaction history (expenses that contributed to the balance)

**FR-BAL-04** — Settlement entry: a special entry type (no category, no GST) that records a reimbursement from payout to a partner.

**FR-BAL-05** — Settlement entries appear in the expense list with a "Settlement" pill and are excluded from P&L and GST reports.

### 4.7 GST Support

**FR-GST-01** — Every expense can have a GST rate: 0%, 5%, 12%, 18%, 28%.

**FR-GST-02** — Base amount and GST amount computed:
- If "Amount is inclusive of GST": base = amount / (1 + rate); GST = amount − base
- If "Amount is exclusive of GST": base = amount; GST = amount × rate; total = amount + GST
- Default: inclusive (most UPI payments are total amounts)
- Toggle per entry

**FR-GST-03** — CGST/SGST split is 50/50 of GST amount by default (intrastate). Interstate toggle switches to IGST (full GST amount).

**FR-GST-04** — Vendor GST number field (GSTIN) — 15-char, validated format.

**FR-GST-05** — GST Summary report (see §4.8) aggregates by rate and separates CGST/SGST/IGST.

### 4.8 Reports

**FR-RPT-01 — P&L Summary**
- Date range (default: current month)
- Total expenses by category
- Total expenses by funding source
- Net expense (after GST input credit estimate)
- Chart: category breakdown (donut)
- Chart: daily spend trend (bar)

**FR-RPT-02 — GST Summary**
- Period: monthly (default), custom range
- Table: GST rate | Taxable amount | CGST | SGST | IGST | Total GST
- Subtotals per rate
- Grand total
- Exportable (PDF / CSV)
- Format designed to map directly to GSTR-3B input fields

**FR-RPT-03 — Partner Settlement Report**
- Per-partner: expenses paid, settlements received, net outstanding
- Chronological transaction list

**FR-RPT-04 — Category Trend**
- Month-over-month trend per category
- Useful for identifying cost increases

### 4.9 Exports

**FR-EXP-01 — CSV Export**
Fields: date, description, category, vendor, GSTIN, invoice no., gross amount, base amount, GST rate, CGST, SGST, IGST, payment method, funding source, store, has invoice, notes.

**FR-EXP-02 — PDF Export**
- Header: organization name, period, generated date
- Summary table (totals by category)
- GST summary table
- Full expense list
- Footer: "Generated by Ledgr"

**FR-EXP-03** — Exports honor active filters. Export what you see.

**FR-EXP-04** — Export initiated from Reports screen and from List screen.

### 4.10 Settings (Admin only)

- Organization name, GSTIN, address
- Manage categories (add, rename, reorder, hide)
- Manage recurring templates
- Partner names (labels for Partner 2, Partner 3 — e.g., "Raju", "Meera")
- Default GST type (inclusive / exclusive)
- Feature flag toggle (visible only to super-admin / system admin)
- Store management: Admin can create/rename stores directly in Ledgr settings. When the inventory module is also active for the same org, stores are shared via the backend — the same `stores` table is read by both modules. Ledgr never calls inventory-specific API endpoints to fetch stores; it uses `/api/v1/ledgr/stores` which is a Ledgr-owned read endpoint over the shared table.

---

## 5. Non-Functional Requirements

**NFR-01 — Performance**
- Calendar month view renders in < 200ms
- Expense list (1000 entries) loads in < 500ms
- Quick Add form ready to type in < 100ms

**NFR-02 — Offline (v1 web)**
- Calendar view and entry list readable offline via browser cache
- Entry creation queued offline, synced on reconnect
- No offline writes on locked days (enforce server-side)

**NFR-03 — Security**
- All API routes require JWT (existing middleware)
- Role checks enforced server-side, not just UI-hidden
- Locked day mutation blocked at API level (not just UI)
- Attachment files stored with signed URLs or behind auth

**NFR-04 — Data Integrity**
- Lock state transitions are server-side state machine (Draft → PendingReview → Locked → Draft)
- Transition audit log: who locked/unlocked and when
- Amounts stored as integers (paise) to avoid float errors

**NFR-05 — Module Isolation**
- All expense-tracker code lives in `expense-tracker/` directory (frontend) and `/api/v1/ledgr/` routes (backend)
- The Ledgr frontend is **always deployed separately** — its own origin, its own build, its own login page
- No imports from expense-tracker into the inventory frontend, and vice versa
- Backend: Ledgr may read from shared tables (`stores`, `users`, `organizations`) but never writes to inventory-owned tables and never calls inventory service/repository code
- Backend: Ledgr defines its own context helpers (e.g., `OrgIDFromContext`) within `backend/internal/ledgr/` — it does not import from `backend/internal/middleware` for domain logic
- Feature flag: checked at request time via middleware (not at route registration) so it can be hot-toggled per org without server restart
- When inventory module is absent (standalone Ledgr deployment), all `/api/v1/ledgr/` routes function identically — no runtime dependency on inventory handlers

**NFR-06 — Testing**
- Backend: ≥ 80% unit test coverage on domain logic and repository
- Backend: integration tests for all API routes
- Frontend: unit tests for GST computation logic
- Frontend: E2E tests for Quick Add flow and day lock workflow

**NFR-07 — Documentation**
- Every API endpoint documented (OpenAPI / Swagger)
- Every Go package has a package-level doc comment
- IMPLEMENTATION.md in expense-tracker/ describes directory layout and extension points

---

## 6. User Stories (Key Flows)

### US-01 — Quick expense after UPI payment
> As an admin, I want to log a UPI expense in under 15 seconds so I don't lose the entry while in the middle of something.

**Acceptance criteria:**
- Fab/quick-add button always visible
- Defaults: today's date, UPI payment method, last used category and funding source remembered
- 5-field entry (amount, category, funding, payment method, save) completes in ≤5 taps
- Entry appears in today's calendar cell immediately

### US-02 — End-of-day completion
> As an admin, I want to mark a day "Entries Done" once I've reviewed all entries for that day so my partner knows not to add more.

**Acceptance criteria:**
- Day panel has "Mark as Done" button when day is in Has Entries or Empty state
- Confirmation prompt: "Mark [date] as done? You can still edit until reviewed."
- Day cell transitions to Pending Review state
- Other users see the state change in real time (or on next load)

### US-03 — Month-end lock
> As an admin, I want to approve and lock all days in a month so the records are final and tamper-proof.

**Acceptance criteria:**
- "Lock Day" button in day panel (admin only), visible when state = Pending Review
- Bulk action: "Lock all pending review days in [month]" from calendar header
- Locked days show padlock icon in calendar cell
- Any attempt to edit a locked entry shows error with admin contact message

### US-04 — GST filing prep
> As an admin, I want to export a GST summary for the month so I (or my CA) can file GSTR-3B.

**Acceptance criteria:**
- GST Summary report has CGST/SGST/IGST breakdown by rate
- Export as PDF and CSV
- CSV columns map to GSTR-3B input fields (documented in export header row)
- Report excludes settlement entries

### US-05 — Salary with deductions
> As an admin, I want to log a monthly salary payment with leave deductions so the net amount paid is recorded accurately.

**Acceptance criteria:**
- Salary form: employee name, gross, deduction rows (type + amount), net (computed)
- Deduction types: Leave, Advance Recovery, Other (free text)
- Net amount is what gets booked as the expense amount
- Salary entry tagged with "Salary" pill in list view

### US-06 — Partner reimbursement
> As an admin, I want to record when a partner has been reimbursed from the payout account so the balance ledger is accurate.

**Acceptance criteria:**
- Settlement entry: from funding source (Payout), to partner (Partner 2 / 3)
- Amount
- Date
- Appears in partner ledger as a credit
- Excluded from P&L and GST reports

---

## 7. Out-of-Scope Clarifications

| Request | Decision |
|---|---|
| Auto-import bank statement | Out of scope v1. Too much trust risk for a financial tool. |
| OCR receipts | Out of scope v1. Manual entry + screenshot attachment. |
| Invoice generation | Out of scope v1. Export only. |
| Multi-org admin | Feature flag per org. Super-admin management out of scope v1. |
| Real-time multi-user sync | WebSocket not required. Refresh on reconnect is sufficient. |

---

## 8. Open Questions

| # | Question | Owner | Target |
|---|---|---|---|
| OQ-01 | What is the max receipt file size acceptable? | Admin | Before backend implementation |
| OQ-02 | Should locked days be unlockable by anyone with Admin role, or only by the user who locked them? | Admin | Before lock state machine implementation |
| OQ-03 | Are vendor GSTIN lookups needed (auto-fill from GSTIN API)? | Admin | v1.1 consideration |
| OQ-04 | Should salary templates exist (same employee, recurring)? | Admin | Covered by recurring templates FR-REC |
| OQ-05 | What happens to partner balance when an org is disabled? | System | Before feature flag implementation |
| OQ-06 | Max receipt file size per attachment? | Admin | Before backend implementation |
| OQ-07 | Attachment storage backend for v1: local disk or object storage (S3/R2)? | System | Before backend implementation — local disk acceptable for v1 |
