package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewAttachmentRepository returns an AttachmentRepository backed by SQLite.
func NewAttachmentRepository(db *sql.DB) AttachmentRepository {
	return &attachmentRepo{db: db}
}

type attachmentRepo struct {
	db *sql.DB
}

func (r *attachmentRepo) Create(ctx context.Context, a *domain.Attachment) error {
	a.UploadedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ledgr_attachments (expense_id, file_name, file_type, file_url, file_size, uploaded_by, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, a.ExpenseID, a.FileName, a.FileType, a.FileURL, a.FileSize, a.UploadedBy, a.UploadedAt)
	return err
}

func (r *attachmentRepo) GetByID(ctx context.Context, id string) (*domain.Attachment, error) {
	var a domain.Attachment
	err := r.db.QueryRowContext(ctx, `
		SELECT id, expense_id, file_name, file_type, file_url, file_size, uploaded_by, uploaded_at
		FROM ledgr_attachments WHERE id = ?
	`, id).Scan(&a.ID, &a.ExpenseID, &a.FileName, &a.FileType, &a.FileURL, &a.FileSize, &a.UploadedBy, &a.UploadedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &a, err
}

func (r *attachmentRepo) ListByExpense(ctx context.Context, expenseID string) ([]*domain.Attachment, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, expense_id, file_name, file_type, file_url, file_size, uploaded_by, uploaded_at
		FROM ledgr_attachments WHERE expense_id = ?
		ORDER BY uploaded_at
	`, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Attachment
	for rows.Next() {
		var a domain.Attachment
		if err := rows.Scan(&a.ID, &a.ExpenseID, &a.FileName, &a.FileType, &a.FileURL, &a.FileSize, &a.UploadedBy, &a.UploadedAt); err != nil {
			return nil, err
		}
		result = append(result, &a)
	}
	return result, rows.Err()
}

func (r *attachmentRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM ledgr_attachments WHERE id = ?`, id)
	return err
}
