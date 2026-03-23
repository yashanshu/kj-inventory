// Package repository defines the data-access interfaces for the Ledgr module.
// All concrete implementations live in the same package and depend on *sql.DB.
package repository

import (
	"context"

	"hasufel.kj/internal/ledgr/domain"
)

// ExpenseRepository handles CRUD for ledgr_expenses.
type ExpenseRepository interface {
	Create(ctx context.Context, e *domain.Expense) error
	GetByID(ctx context.Context, orgID, id string) (*domain.Expense, error)
	List(ctx context.Context, orgID string, f domain.ExpenseFilters) ([]*domain.Expense, int, error)
	Update(ctx context.Context, e *domain.Expense) error
	Delete(ctx context.Context, orgID, id string) error
	CalendarSummary(ctx context.Context, orgID string, year, month int) (*domain.CalendarSummary, error)
	// Reporting helpers — return only non-settlement entries unless noted.
	SumByCategory(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.CategoryTotal, error)
	SumByFunding(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.FundingTotal, error)
	GSTRows(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.GSTRow, error)
	SettlementsByPartner(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.PartnerReportEntry, error)
}

// CategoryRepository handles CRUD for ledgr_categories.
type CategoryRepository interface {
	Seed(ctx context.Context, orgID string) error // insert system categories if none exist
	List(ctx context.Context, orgID string) ([]*domain.Category, error)
	GetByID(ctx context.Context, orgID, id string) (*domain.Category, error)
	Create(ctx context.Context, c *domain.Category) error
	Update(ctx context.Context, c *domain.Category) error
	Delete(ctx context.Context, orgID, id string) error // fails if is_system = true
}

// DaylogRepository handles the day state machine and audit log.
type DaylogRepository interface {
	GetOrCreate(ctx context.Context, orgID, date string) (*domain.DayLog, error)
	Get(ctx context.Context, orgID, date string) (*domain.DayLog, error) // nil if not found
	Transition(ctx context.Context, orgID, date string, to domain.DayState, userID string) error
	AppendAudit(ctx context.Context, a *domain.DayLogAudit) error
}

// TemplateRepository handles CRUD for ledgr_templates (admin only).
type TemplateRepository interface {
	List(ctx context.Context, orgID string) ([]*domain.Template, error)
	GetByID(ctx context.Context, orgID, id string) (*domain.Template, error)
	Create(ctx context.Context, t *domain.Template) error
	Update(ctx context.Context, t *domain.Template) error
	Delete(ctx context.Context, orgID, id string) error
}

// PartnerRepository computes partner balances from the expense ledger.
type PartnerRepository interface {
	Balances(ctx context.Context, orgID string) (*domain.PartnerBalances, error)
}

// OrgRepository checks organization-level settings for the Ledgr feature flag.
type OrgRepository interface {
	IsLedgrEnabled(ctx context.Context, orgID string) (bool, error)
	// EnsureLedgrColumn adds ledgr_enabled column if missing (combined deployment).
	EnsureLedgrColumn() error
}

// StoreRepository reads from the shared stores table (read-only for Ledgr).
type StoreRepository interface {
	ListByOrg(ctx context.Context, orgID string) ([]StoreRow, error)
}

// StoreRow is the minimal store shape Ledgr exposes via /api/v1/ledgr/stores.
type StoreRow struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Code      string `json:"code"`
	IsPrimary bool   `json:"is_primary"`
}

// SalaryRepository handles salary sub-details linked to expense entries.
type SalaryRepository interface {
	Create(ctx context.Context, s *domain.SalaryDetails) error
	GetByExpenseID(ctx context.Context, expenseID string) (*domain.SalaryDetails, error)
	Delete(ctx context.Context, expenseID string) error
}

// AttachmentRepository handles file metadata for receipt attachments.
type AttachmentRepository interface {
	Create(ctx context.Context, a *domain.Attachment) error
	GetByID(ctx context.Context, id string) (*domain.Attachment, error)
	ListByExpense(ctx context.Context, expenseID string) ([]*domain.Attachment, error)
	Delete(ctx context.Context, id string) error
}
