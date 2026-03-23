package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"hasufel.kj/internal/ledgr/domain"
)

// NewCategoryRepository returns a CategoryRepository backed by SQLite.
func NewCategoryRepository(db *sql.DB) CategoryRepository {
	return &categoryRepo{db: db}
}

type categoryRepo struct {
	db *sql.DB
}

func (r *categoryRepo) Seed(ctx context.Context, orgID string) error {
	// Check if any categories already exist for this org.
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM ledgr_categories WHERE org_id = ?`, orgID,
	).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil // already seeded
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO ledgr_categories (org_id, name, sort_order, is_system, created_at)
		VALUES (?, ?, ?, 1, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	now := time.Now().UTC()
	for i, name := range domain.SystemCategories {
		if _, err := stmt.ExecContext(ctx, orgID, name, i, now); err != nil {
			return fmt.Errorf("seed category %q: %w", name, err)
		}
	}
	return tx.Commit()
}

func (r *categoryRepo) List(ctx context.Context, orgID string) ([]*domain.Category, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, org_id, name, sort_order, is_hidden, is_system, created_at
		FROM ledgr_categories
		WHERE org_id = ?
		ORDER BY sort_order, name
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*domain.Category
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

func (r *categoryRepo) GetByID(ctx context.Context, orgID, id string) (*domain.Category, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, org_id, name, sort_order, is_hidden, is_system, created_at
		FROM ledgr_categories
		WHERE org_id = ? AND id = ?
	`, orgID, id)
	c, err := scanCategoryRow(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

func (r *categoryRepo) Create(ctx context.Context, c *domain.Category) error {
	c.CreatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ledgr_categories (org_id, name, sort_order, is_hidden, is_system, created_at)
		VALUES (?, ?, ?, ?, 0, ?)
	`, c.OrgID, c.Name, c.SortOrder, boolInt(c.IsHidden), c.CreatedAt)
	return err
}

func (r *categoryRepo) Update(ctx context.Context, c *domain.Category) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE ledgr_categories
		SET name = ?, sort_order = ?, is_hidden = ?
		WHERE org_id = ? AND id = ?
	`, c.Name, c.SortOrder, boolInt(c.IsHidden), c.OrgID, c.ID)
	return err
}

func (r *categoryRepo) Delete(ctx context.Context, orgID, id string) error {
	// Block deletion of system categories.
	var isSystem int
	err := r.db.QueryRowContext(ctx,
		`SELECT is_system FROM ledgr_categories WHERE org_id = ? AND id = ?`, orgID, id,
	).Scan(&isSystem)
	if errors.Is(err, sql.ErrNoRows) {
		return nil // already gone
	}
	if err != nil {
		return err
	}
	if isSystem == 1 {
		return errors.New("system categories cannot be deleted")
	}
	_, err = r.db.ExecContext(ctx,
		`DELETE FROM ledgr_categories WHERE org_id = ? AND id = ?`, orgID, id)
	return err
}

// ---- scan helpers ----

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCategory(r rowScanner) (*domain.Category, error) {
	var c domain.Category
	var isHidden, isSystem int
	if err := r.Scan(&c.ID, &c.OrgID, &c.Name, &c.SortOrder, &isHidden, &isSystem, &c.CreatedAt); err != nil {
		return nil, err
	}
	c.IsHidden = isHidden == 1
	c.IsSystem = isSystem == 1
	return &c, nil
}

func scanCategoryRow(r *sql.Row) (*domain.Category, error) {
	var c domain.Category
	var isHidden, isSystem int
	if err := r.Scan(&c.ID, &c.OrgID, &c.Name, &c.SortOrder, &isHidden, &isSystem, &c.CreatedAt); err != nil {
		return nil, err
	}
	c.IsHidden = isHidden == 1
	c.IsSystem = isSystem == 1
	return &c, nil
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
