package service

import (
	"context"
	"errors"
	"fmt"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
)

// ExpenseService orchestrates expense creation, updates, and deletion
// while enforcing day-lock constraints.
type ExpenseService struct {
	expenses   repository.ExpenseRepository
	categories repository.CategoryRepository
	daylogs    repository.DaylogRepository
}

// NewExpenseService creates an ExpenseService with the required repositories.
func NewExpenseService(
	expenses repository.ExpenseRepository,
	categories repository.CategoryRepository,
	daylogs repository.DaylogRepository,
) *ExpenseService {
	return &ExpenseService{expenses: expenses, categories: categories, daylogs: daylogs}
}

// Create validates and persists a new expense. GST fields are (re)computed
// from the provided rate/inclusive/interstate flags to ensure consistency.
func (s *ExpenseService) Create(ctx context.Context, e *domain.Expense) error {
	if err := s.validate(e); err != nil {
		return err
	}
	s.applyGST(e)
	return s.expenses.Create(ctx, e)
}

// Get returns the expense by ID, scoped to the org.
func (s *ExpenseService) Get(ctx context.Context, orgID, id string) (*domain.Expense, error) {
	e, err := s.expenses.GetByID(ctx, orgID, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, fmt.Errorf("expense not found")
	}
	return e, nil
}

// List returns a paginated, filtered expense list for the org.
func (s *ExpenseService) List(ctx context.Context, orgID string, f domain.ExpenseFilters) ([]*domain.Expense, int, error) {
	return s.expenses.List(ctx, orgID, f)
}

// Update replaces mutable fields on an existing expense. Blocked if day is locked.
func (s *ExpenseService) Update(ctx context.Context, e *domain.Expense) error {
	if err := s.checkDayLocked(ctx, e.OrgID, e.Date); err != nil {
		return err
	}
	if err := s.validate(e); err != nil {
		return err
	}
	s.applyGST(e)
	return s.expenses.Update(ctx, e)
}

// Delete removes an expense. Blocked if day is locked.
func (s *ExpenseService) Delete(ctx context.Context, orgID, id string) error {
	e, err := s.expenses.GetByID(ctx, orgID, id)
	if err != nil {
		return err
	}
	if e == nil {
		return errors.New("expense not found")
	}
	if err := s.checkDayLocked(ctx, orgID, e.Date); err != nil {
		return err
	}
	return s.expenses.Delete(ctx, orgID, id)
}

// CalendarSummary returns the month-view summary.
func (s *ExpenseService) CalendarSummary(ctx context.Context, orgID string, year, month int) (*domain.CalendarSummary, error) {
	return s.expenses.CalendarSummary(ctx, orgID, year, month)
}

// ---- internal helpers ----

func (s *ExpenseService) checkDayLocked(ctx context.Context, orgID, date string) error {
	dl, err := s.daylogs.Get(ctx, orgID, date)
	if err != nil {
		return err
	}
	if dl != nil && dl.State == domain.DayStateLocked {
		return errors.New("day is locked — contact admin to unlock")
	}
	return nil
}

func (s *ExpenseService) validate(e *domain.Expense) error {
	if e.OrgID == "" {
		return errors.New("org_id is required")
	}
	if e.Date == "" {
		return errors.New("date is required")
	}
	if e.AmountPaise <= 0 {
		return errors.New("amount must be positive")
	}
	if !e.FundingSource.Valid() {
		return fmt.Errorf("invalid funding_source: %q", e.FundingSource)
	}
	if !e.PaymentMethod.Valid() {
		return fmt.Errorf("invalid payment_method: %q", e.PaymentMethod)
	}
	if !e.GSTRate.Valid() {
		return fmt.Errorf("invalid gst_rate: %q", e.GSTRate)
	}
	if !e.EntryType.Valid() {
		return fmt.Errorf("invalid entry_type: %q", e.EntryType)
	}
	return nil
}

func (s *ExpenseService) applyGST(e *domain.Expense) {
	result := ComputeGST(e.AmountPaise, e.GSTRate, e.GSTInclusive, e.IsInterstate)
	e.BasePaise = result.BasePaise
	e.CGSTPaise = result.CGSTPaise
	e.SGSTPaise = result.SGSTPaise
	e.IGSTPaise = result.IGSTPaise
	// Normalise amount to gross (inclusive already is gross; exclusive: update to total).
	if !e.GSTInclusive {
		e.AmountPaise = result.TotalPaise
	}
}
