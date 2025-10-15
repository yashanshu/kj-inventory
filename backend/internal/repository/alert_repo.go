package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

func NewAlertRepository(db *sql.DB) AlertRepository {
	return &alertRepoSQLite{db: db}
}

type alertRepoSQLite struct {
	db *sql.DB
}

func (r *alertRepoSQLite) Create(ctx context.Context, alert *domain.Alert) (uuid.UUID, error) {
	if alert == nil {
		return uuid.Nil, errors.New("alert is nil")
	}

	if alert.ID == uuid.Nil {
		alert.ID = uuid.New()
	}
	if alert.CreatedAt.IsZero() {
		alert.CreatedAt = time.Now().UTC()
	}

	var itemIDStr *string
	if alert.ItemID != nil {
		s := alert.ItemID.String()
		itemIDStr = &s
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO alerts (
			id, organization_id, item_id, type, severity,
			title, message, is_read, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		alert.ID.String(), alert.OrganizationID.String(),
		itemIDStr, alert.Type, alert.Severity,
		alert.Title, alert.Message, alert.IsRead, alert.CreatedAt,
	)
	if err != nil {
		return uuid.Nil, err
	}
	return alert.ID, nil
}

func (r *alertRepoSQLite) GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, item_id, type, severity,
		       title, message, is_read, created_at
		FROM alerts WHERE id = ?
	`, id.String())

	var alert domain.Alert
	var idStr, orgStr string
	var itemStr *string

	if err := row.Scan(
		&idStr, &orgStr, &itemStr, &alert.Type, &alert.Severity,
		&alert.Title, &alert.Message, &alert.IsRead, &alert.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	alert.ID, _ = uuid.Parse(idStr)
	alert.OrganizationID, _ = uuid.Parse(orgStr)
	if itemStr != nil {
		itemID, _ := uuid.Parse(*itemStr)
		alert.ItemID = &itemID
	}

	return &alert, nil
}

func (r *alertRepoSQLite) ListUnread(ctx context.Context, orgID uuid.UUID, limit int) ([]*domain.Alert, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, item_id, type, severity,
		       title, message, is_read, created_at
		FROM alerts
		WHERE organization_id = ? AND is_read = false
		ORDER BY created_at DESC
		LIMIT ?
	`, orgID.String(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanAlerts(rows)
}

func (r *alertRepoSQLite) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Alert, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, item_id, type, severity,
		       title, message, is_read, created_at
		FROM alerts
		WHERE organization_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, orgID.String(), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanAlerts(rows)
}

func (r *alertRepoSQLite) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE alerts SET is_read = true WHERE id = ?
	`, id.String())
	return err
}

func (r *alertRepoSQLite) DeleteByItemID(ctx context.Context, itemID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM alerts WHERE item_id = ?
	`, itemID.String())
	return err
}

// scanAlerts is a helper function to scan multiple alert rows
func (r *alertRepoSQLite) scanAlerts(rows *sql.Rows) ([]*domain.Alert, error) {
	var alerts []*domain.Alert
	for rows.Next() {
		var alert domain.Alert
		var idStr, orgStr string
		var itemStr *string

		if err := rows.Scan(
			&idStr, &orgStr, &itemStr, &alert.Type, &alert.Severity,
			&alert.Title, &alert.Message, &alert.IsRead, &alert.CreatedAt,
		); err != nil {
			return nil, err
		}

		alert.ID, _ = uuid.Parse(idStr)
		alert.OrganizationID, _ = uuid.Parse(orgStr)
		if itemStr != nil {
			itemID, _ := uuid.Parse(*itemStr)
			alert.ItemID = &itemID
		}
		alerts = append(alerts, &alert)
	}

	return alerts, rows.Err()
}
