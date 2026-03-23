package repository

import (
	"context"
	"database/sql"
	"strings"
)

// NewOrgRepository returns an OrgRepository backed by SQLite.
func NewOrgRepository(db *sql.DB) OrgRepository {
	return &orgRepo{db: db}
}

type orgRepo struct {
	db *sql.DB
}

func (r *orgRepo) IsLedgrEnabled(ctx context.Context, orgID string) (bool, error) {
	var enabled int
	err := r.db.QueryRowContext(ctx,
		`SELECT ledgr_enabled FROM organizations WHERE id = ?`, orgID,
	).Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled == 1, nil
}

func (r *orgRepo) EnsureLedgrColumn() error {
	_, err := r.db.Exec(`ALTER TABLE organizations ADD COLUMN ledgr_enabled INTEGER NOT NULL DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column") {
		return err
	}
	return nil
}
