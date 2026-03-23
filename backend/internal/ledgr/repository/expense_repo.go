package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewExpenseRepository returns an ExpenseRepository backed by SQLite.
func NewExpenseRepository(db *sql.DB) ExpenseRepository {
	return &expenseRepo{db: db}
}

type expenseRepo struct {
	db *sql.DB
}

func (r *expenseRepo) Create(ctx context.Context, e *domain.Expense) error {
	now := time.Now().UTC()
	e.CreatedAt = now
	e.UpdatedAt = now
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ledgr_expenses (
			org_id, store_id, date, amount_paise, base_paise,
			gst_rate, cgst_paise, sgst_paise, igst_paise,
			gst_inclusive, is_interstate,
			category_id, funding_source, payment_method,
			vendor_name, vendor_gstin, invoice_number, has_invoice,
			entry_type, description, created_by, created_at, updated_at
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		e.OrgID, nullStr(e.StoreID), e.Date,
		e.AmountPaise, e.BasePaise,
		string(e.GSTRate), e.CGSTPaise, e.SGSTPaise, e.IGSTPaise,
		boolInt(e.GSTInclusive), boolInt(e.IsInterstate),
		e.CategoryID, string(e.FundingSource), string(e.PaymentMethod),
		nullStr(e.VendorName), nullStr(e.VendorGSTIN), nullStr(e.InvoiceNumber), boolInt(e.HasInvoice),
		string(e.EntryType), nullStr(e.Description),
		e.CreatedBy, e.CreatedAt, e.UpdatedAt,
	)
	return err
}

func (r *expenseRepo) GetByID(ctx context.Context, orgID, id string) (*domain.Expense, error) {
	row := r.db.QueryRowContext(ctx, expenseSelectSQL+` WHERE e.org_id = ? AND e.id = ?`, orgID, id)
	e, err := scanExpense(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return e, err
}

func (r *expenseRepo) List(ctx context.Context, orgID string, f domain.ExpenseFilters) ([]*domain.Expense, int, error) {
	where, args := buildExpenseWhere(orgID, f)

	// Count total matching rows (for pagination).
	countSQL := `SELECT COUNT(*) FROM ledgr_expenses e WHERE ` + where
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch page.
	page := f.Page
	if page < 1 {
		page = 1
	}
	perPage := f.PerPage
	if perPage < 1 || perPage > 200 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	listSQL := expenseSelectSQL + ` WHERE ` + where + ` ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?`
	listArgs := append(args, perPage, offset)

	rows, err := r.db.QueryContext(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []*domain.Expense
	for rows.Next() {
		e, err := scanExpenseRows(rows)
		if err != nil {
			return nil, 0, err
		}
		result = append(result, e)
	}
	return result, total, rows.Err()
}

func (r *expenseRepo) Update(ctx context.Context, e *domain.Expense) error {
	e.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE ledgr_expenses SET
			store_id=?, date=?, amount_paise=?, base_paise=?,
			gst_rate=?, cgst_paise=?, sgst_paise=?, igst_paise=?,
			gst_inclusive=?, is_interstate=?,
			category_id=?, funding_source=?, payment_method=?,
			vendor_name=?, vendor_gstin=?, invoice_number=?, has_invoice=?,
			entry_type=?, description=?, updated_at=?
		WHERE org_id=? AND id=?`,
		nullStr(e.StoreID), e.Date, e.AmountPaise, e.BasePaise,
		string(e.GSTRate), e.CGSTPaise, e.SGSTPaise, e.IGSTPaise,
		boolInt(e.GSTInclusive), boolInt(e.IsInterstate),
		e.CategoryID, string(e.FundingSource), string(e.PaymentMethod),
		nullStr(e.VendorName), nullStr(e.VendorGSTIN), nullStr(e.InvoiceNumber), boolInt(e.HasInvoice),
		string(e.EntryType), nullStr(e.Description), e.UpdatedAt,
		e.OrgID, e.ID,
	)
	return err
}

func (r *expenseRepo) Delete(ctx context.Context, orgID, id string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM ledgr_expenses WHERE org_id = ? AND id = ?`, orgID, id)
	return err
}

func (r *expenseRepo) CalendarSummary(ctx context.Context, orgID string, year, month int) (*domain.CalendarSummary, error) {
	dateFrom := fmt.Sprintf("%04d-%02d-01", year, month)
	// Last day of month: use next month's first day minus one day logic via string padding.
	nextMonth := month + 1
	nextYear := year
	if nextMonth > 12 {
		nextMonth = 1
		nextYear++
	}
	dateTo := fmt.Sprintf("%04d-%02d-01", nextYear, nextMonth) // exclusive upper bound

	rows, err := r.db.QueryContext(ctx, `
		SELECT date,
		       COUNT(*) AS entry_count,
		       COALESCE(SUM(amount_paise),0) AS total_paise,
		       COALESCE(SUM(base_paise),0)   AS base_paise,
		       COALESCE(SUM(cgst_paise+sgst_paise+igst_paise),0) AS gst_paise
		FROM ledgr_expenses
		WHERE org_id = ? AND date >= ? AND date < ?
		  AND entry_type != 'settlement'
		GROUP BY date
		ORDER BY date
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expensesByDate := map[string]domain.CalendarDay{}
	var monthTotal int64
	for rows.Next() {
		var d domain.CalendarDay
		if err := rows.Scan(&d.Date, &d.EntryCount, &d.TotalPaise, &d.BasePaise, &d.GSTPaise); err != nil {
			return nil, err
		}
		expensesByDate[d.Date] = d
		monthTotal += d.TotalPaise
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Fetch day states from daylog.
	stateRows, err := r.db.QueryContext(ctx, `
		SELECT date, state FROM ledgr_daylog
		WHERE org_id = ? AND date >= ? AND date < ?
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer stateRows.Close()

	stateByDate := map[string]domain.DayState{}
	for stateRows.Next() {
		var date, state string
		if err := stateRows.Scan(&date, &state); err != nil {
			return nil, err
		}
		stateByDate[date] = domain.DayState(state)
	}

	// Build calendar days for every day in the month.
	today := time.Now().UTC().Format("2006-01-02")
	days := buildCalendarDays(year, month, expensesByDate, stateByDate, today)

	// Compute week totals.
	weekTotals := computeWeekTotals(days)

	return &domain.CalendarSummary{
		Year:            year,
		Month:           month,
		Days:            days,
		WeekTotals:      weekTotals,
		MonthTotalPaise: monthTotal,
	}, nil
}

// ---- reporting helpers ----

func (r *expenseRepo) SumByCategory(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.CategoryTotal, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT e.category_id, COALESCE(c.name,'') AS name,
		       SUM(e.amount_paise) AS total, COUNT(*) AS cnt
		FROM ledgr_expenses e
		LEFT JOIN ledgr_categories c ON c.id = e.category_id
		WHERE e.org_id = ? AND e.date >= ? AND e.date <= ?
		  AND e.entry_type != 'settlement'
		GROUP BY e.category_id
		ORDER BY total DESC
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.CategoryTotal{}
	for rows.Next() {
		var ct domain.CategoryTotal
		if err := rows.Scan(&ct.CategoryID, &ct.CategoryName, &ct.TotalPaise, &ct.EntryCount); err != nil {
			return nil, err
		}
		result = append(result, ct)
	}
	return result, rows.Err()
}

func (r *expenseRepo) SumByFunding(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.FundingTotal, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT funding_source, SUM(amount_paise)
		FROM ledgr_expenses
		WHERE org_id = ? AND date >= ? AND date <= ?
		  AND entry_type != 'settlement'
		GROUP BY funding_source
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.FundingTotal{}
	for rows.Next() {
		var ft domain.FundingTotal
		var fs string
		if err := rows.Scan(&fs, &ft.TotalPaise); err != nil {
			return nil, err
		}
		ft.FundingSource = domain.FundingSource(fs)
		result = append(result, ft)
	}
	return result, rows.Err()
}

func (r *expenseRepo) GSTRows(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.GSTRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT gst_rate,
		       SUM(base_paise)                          AS taxable,
		       SUM(cgst_paise)                          AS cgst,
		       SUM(sgst_paise)                          AS sgst,
		       SUM(igst_paise)                          AS igst,
		       SUM(cgst_paise+sgst_paise+igst_paise)    AS total_gst
		FROM ledgr_expenses
		WHERE org_id = ? AND date >= ? AND date <= ?
		  AND entry_type != 'settlement'
		  AND gst_rate != '0'
		GROUP BY gst_rate
		ORDER BY CAST(gst_rate AS INTEGER)
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.GSTRow{}
	for rows.Next() {
		var gr domain.GSTRow
		var rate string
		if err := rows.Scan(&rate, &gr.TaxablePaise, &gr.CGSTPaise, &gr.SGSTPaise, &gr.IGSTPaise, &gr.TotalGSTPaise); err != nil {
			return nil, err
		}
		gr.GSTRate = domain.GSTRate(rate)
		result = append(result, gr)
	}
	return result, rows.Err()
}

func (r *expenseRepo) SettlementsByPartner(ctx context.Context, orgID, dateFrom, dateTo string) ([]domain.PartnerReportEntry, error) {
	// Expenses by personal funding sources = spent.
	rows, err := r.db.QueryContext(ctx, `
		SELECT funding_source,
		       SUM(CASE WHEN entry_type != 'settlement' THEN amount_paise ELSE 0 END) AS spent,
		       SUM(CASE WHEN entry_type  = 'settlement' THEN amount_paise ELSE 0 END) AS settled
		FROM ledgr_expenses
		WHERE org_id = ? AND date >= ? AND date <= ?
		  AND funding_source IN ('personal','partner2','partner3')
		GROUP BY funding_source
	`, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []domain.PartnerReportEntry{}
	for rows.Next() {
		var e domain.PartnerReportEntry
		var fs string
		if err := rows.Scan(&fs, &e.TotalSpentPaise, &e.TotalSettledPaise); err != nil {
			return nil, err
		}
		e.FundingSource = domain.FundingSource(fs)
		e.NetOwedPaise = e.TotalSpentPaise - e.TotalSettledPaise
		result = append(result, e)
	}
	return result, rows.Err()
}

// ---- SQL helpers ----

const expenseSelectSQL = `
SELECT e.id, e.org_id, e.store_id, e.date,
       e.amount_paise, e.base_paise,
       e.gst_rate, e.cgst_paise, e.sgst_paise, e.igst_paise,
       e.gst_inclusive, e.is_interstate,
       e.category_id, e.funding_source, e.payment_method,
       e.vendor_name, e.vendor_gstin, e.invoice_number, e.has_invoice,
       e.entry_type, e.description,
       e.created_by, e.created_at, e.updated_at
FROM ledgr_expenses e`

func buildExpenseWhere(orgID string, f domain.ExpenseFilters) (string, []any) {
	clauses := []string{"e.org_id = ?"}
	args := []any{orgID}

	if f.DateFrom != "" {
		clauses = append(clauses, "e.date >= ?")
		args = append(args, f.DateFrom)
	}
	if f.DateTo != "" {
		clauses = append(clauses, "e.date <= ?")
		args = append(args, f.DateTo)
	}
	if f.CategoryID != "" {
		clauses = append(clauses, "e.category_id = ?")
		args = append(args, f.CategoryID)
	}
	if f.FundingSource != "" {
		clauses = append(clauses, "e.funding_source = ?")
		args = append(args, string(f.FundingSource))
	}
	if f.PaymentMethod != "" {
		clauses = append(clauses, "e.payment_method = ?")
		args = append(args, string(f.PaymentMethod))
	}
	if f.StoreID != "" {
		clauses = append(clauses, "e.store_id = ?")
		args = append(args, f.StoreID)
	}
	if f.EntryType != "" {
		clauses = append(clauses, "e.entry_type = ?")
		args = append(args, string(f.EntryType))
	}
	return strings.Join(clauses, " AND "), args
}

func scanExpense(r *sql.Row) (*domain.Expense, error) {
	return scanExpenseFromScanner(r)
}

func scanExpenseRows(r *sql.Rows) (*domain.Expense, error) {
	return scanExpenseFromScanner(r)
}

type scanner interface {
	Scan(dest ...any) error
}

func scanExpenseFromScanner(s scanner) (*domain.Expense, error) {
	var e domain.Expense
	var (
		storeID, vendorName, vendorGSTIN, invoiceNumber, description sql.NullString
		gstInclusive, isInterstate, hasInvoice                      int
		gstRate, fundingSource, paymentMethod, entryType             string
	)
	err := s.Scan(
		&e.ID, &e.OrgID, &storeID, &e.Date,
		&e.AmountPaise, &e.BasePaise,
		&gstRate, &e.CGSTPaise, &e.SGSTPaise, &e.IGSTPaise,
		&gstInclusive, &isInterstate,
		&e.CategoryID, &fundingSource, &paymentMethod,
		&vendorName, &vendorGSTIN, &invoiceNumber, &hasInvoice,
		&entryType, &description,
		&e.CreatedBy, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if storeID.Valid {
		e.StoreID = &storeID.String
	}
	if vendorName.Valid {
		e.VendorName = &vendorName.String
	}
	if vendorGSTIN.Valid {
		e.VendorGSTIN = &vendorGSTIN.String
	}
	if invoiceNumber.Valid {
		e.InvoiceNumber = &invoiceNumber.String
	}
	if description.Valid {
		e.Description = &description.String
	}
	e.GSTRate = domain.GSTRate(gstRate)
	e.FundingSource = domain.FundingSource(fundingSource)
	e.PaymentMethod = domain.PaymentMethod(paymentMethod)
	e.EntryType = domain.EntryType(entryType)
	e.GSTInclusive = gstInclusive == 1
	e.IsInterstate = isInterstate == 1
	e.HasInvoice = hasInvoice == 1
	return &e, nil
}

func nullStr(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

// buildCalendarDays constructs the full day slice for a month.
func buildCalendarDays(year, month int, byDate map[string]domain.CalendarDay, states map[string]domain.DayState, today string) []domain.CalendarDay {
	daysInMonth := daysInMonthCount(year, month)
	var days []domain.CalendarDay
	for d := 1; d <= daysInMonth; d++ {
		dateStr := fmt.Sprintf("%04d-%02d-%02d", year, month, d)
		cell := byDate[dateStr] // zero value if not present
		cell.Date = dateStr

		switch {
		case dateStr > today:
			cell.State = "future"
		case states[dateStr] == domain.DayStateLocked:
			cell.State = domain.DayStateLocked
		case states[dateStr] == domain.DayStatePendingReview:
			cell.State = domain.DayStatePendingReview
		case cell.EntryCount > 0:
			cell.State = "has_entries"
		default:
			cell.State = "empty"
		}
		days = append(days, cell)
	}
	return days
}

func computeWeekTotals(days []domain.CalendarDay) []domain.WeekTotal {
	weekTotalsMap := map[int]int64{}
	weekOrder := []int{}
	seen := map[int]bool{}

	for i, d := range days {
		week := i/7 + 1
		weekTotalsMap[week] += d.TotalPaise
		if !seen[week] {
			weekOrder = append(weekOrder, week)
			seen[week] = true
		}
	}
	var result []domain.WeekTotal
	for _, w := range weekOrder {
		result = append(result, domain.WeekTotal{WeekNumber: w, TotalPaise: weekTotalsMap[w]})
	}
	return result
}

func daysInMonthCount(year, month int) int {
	// Go: time.Date with day=0 of next month gives last day of current month.
	t := time.Date(year, time.Month(month+1), 0, 0, 0, 0, 0, time.UTC)
	return t.Day()
}
