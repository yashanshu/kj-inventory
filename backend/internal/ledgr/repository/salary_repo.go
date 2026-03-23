package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewSalaryRepository returns a SalaryRepository backed by SQLite.
func NewSalaryRepository(db *sql.DB) SalaryRepository {
	return &salaryRepo{db: db}
}

type salaryRepo struct {
	db *sql.DB
}

func (r *salaryRepo) Create(ctx context.Context, s *domain.SalaryDetails) error {
	s.CreatedAt = time.Now().UTC()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO ledgr_salary_details (expense_id, employee_name, gross_paise, net_paise, created_at)
		VALUES (?, ?, ?, ?, ?)
	`, s.ExpenseID, s.EmployeeName, s.GrossPaise, s.NetPaise, s.CreatedAt)
	if err != nil {
		return err
	}

	// Get the auto-generated id.
	if err := tx.QueryRowContext(ctx,
		`SELECT id FROM ledgr_salary_details WHERE expense_id = ?`, s.ExpenseID,
	).Scan(&s.ID); err != nil {
		return err
	}

	for i := range s.Deductions {
		d := &s.Deductions[i]
		d.SalaryID = s.ID
		_, err = tx.ExecContext(ctx, `
			INSERT INTO ledgr_salary_deductions (salary_id, deduction_type, deduction_label, amount_paise)
			VALUES (?, ?, ?, ?)
		`, d.SalaryID, string(d.DeductionType), nullStr(d.DeductionLabel), d.AmountPaise)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *salaryRepo) GetByExpenseID(ctx context.Context, expenseID string) (*domain.SalaryDetails, error) {
	var s domain.SalaryDetails
	err := r.db.QueryRowContext(ctx, `
		SELECT id, expense_id, employee_name, gross_paise, net_paise, created_at
		FROM ledgr_salary_details WHERE expense_id = ?
	`, expenseID).Scan(&s.ID, &s.ExpenseID, &s.EmployeeName, &s.GrossPaise, &s.NetPaise, &s.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, salary_id, deduction_type, deduction_label, amount_paise
		FROM ledgr_salary_deductions WHERE salary_id = ?
	`, s.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var d domain.SalaryDeduction
		var dt string
		var label sql.NullString
		if err := rows.Scan(&d.ID, &d.SalaryID, &dt, &label, &d.AmountPaise); err != nil {
			return nil, err
		}
		d.DeductionType = domain.DeductionType(dt)
		if label.Valid {
			d.DeductionLabel = &label.String
		}
		s.Deductions = append(s.Deductions, d)
	}
	return &s, rows.Err()
}

func (r *salaryRepo) Delete(ctx context.Context, expenseID string) error {
	// Deductions cascade via FK.
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM ledgr_salary_details WHERE expense_id = ?`, expenseID)
	return err
}
