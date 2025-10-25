package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

func NewItemRepository(db *sql.DB) ItemRepository {
	return &itemRepoSQLite{db: db}
}

type itemRepoSQLite struct {
	db *sql.DB
}

func (r *itemRepoSQLite) Create(ctx context.Context, item *domain.Item) (uuid.UUID, error) {
	if item == nil {
		return uuid.Nil, errors.New("item is nil")
	}

	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	now := time.Now().UTC()
	item.CreatedAt = now
	item.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO items (
			id, organization_id, category_id, name, sku,
			unit_of_measurement, minimum_threshold, current_stock,
			unit_cost, is_active, track_stock, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		item.ID.String(), item.OrganizationID.String(), item.CategoryID.String(),
		item.Name, item.SKU, item.UnitOfMeasurement, item.MinimumThreshold,
		item.CurrentStock, item.UnitCost, item.IsActive, item.TrackStock, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return uuid.Nil, err
	}
	return item.ID, nil
}

func (r *itemRepoSQLite) GetByID(ctx context.Context, id uuid.UUID) (*domain.Item, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, category_id, name, sku,
		       unit_of_measurement, minimum_threshold, current_stock,
		       unit_cost, is_active, track_stock, created_at, updated_at
	FROM items WHERE id = ?
	`, id.String())

	var it domain.Item
	var (
		idStr, orgStr, catStr string
		sku                   sql.NullString
		unitCost              sql.NullFloat64
	)
	if err := row.Scan(&idStr, &orgStr, &catStr, &it.Name, &sku,
		&it.UnitOfMeasurement, &it.MinimumThreshold, &it.CurrentStock,
		&unitCost, &it.IsActive, &it.TrackStock, &it.CreatedAt, &it.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	it.ID, _ = uuid.Parse(idStr)
	it.OrganizationID, _ = uuid.Parse(orgStr)
	it.CategoryID, _ = uuid.Parse(catStr)
	if sku.Valid {
		it.SKU = &sku.String
	}
	if unitCost.Valid {
		it.UnitCost = &unitCost.Float64
	}

	return &it, nil
}

func (r *itemRepoSQLite) List(ctx context.Context, orgID uuid.UUID, limit, offset int) ([]*domain.Item, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, category_id, name, sku,
		       unit_of_measurement, minimum_threshold, current_stock,
		       unit_cost, is_active, track_stock, created_at, updated_at
		FROM items
		WHERE organization_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, orgID.String(), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.Item
	for rows.Next() {
		var it domain.Item
		var (
			idStr, orgStr, catStr string
			sku                   sql.NullString
			unitCost              sql.NullFloat64
		)
		if err := rows.Scan(&idStr, &orgStr, &catStr, &it.Name, &sku,
			&it.UnitOfMeasurement, &it.MinimumThreshold, &it.CurrentStock,
			&unitCost, &it.IsActive, &it.TrackStock, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		it.ID, _ = uuid.Parse(idStr)
		it.OrganizationID, _ = uuid.Parse(orgStr)
		it.CategoryID, _ = uuid.Parse(catStr)
		if sku.Valid {
			it.SKU = &sku.String
		}
		if unitCost.Valid {
			it.UnitCost = &unitCost.Float64
		}
		items = append(items, &it)
	}

	return items, rows.Err()
}

func (r *itemRepoSQLite) ListWithFilters(ctx context.Context, orgID uuid.UUID, search string, categoryID *uuid.UUID, lowStockOnly bool, limit, offset int) ([]*domain.Item, error) {
	query := `
		SELECT id, organization_id, category_id, name, sku,
		       unit_of_measurement, minimum_threshold, current_stock,
		       unit_cost, is_active, track_stock, created_at, updated_at
		FROM items
		WHERE organization_id = ?`

	args := []interface{}{orgID.String()}

	// Add search filter
	if search != "" {
		query += ` AND (name LIKE ? OR sku LIKE ?)`
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern)
	}

	// Add category filter
	if categoryID != nil {
		query += ` AND category_id = ?`
		args = append(args, categoryID.String())
	}

	// Add low stock filter
	if lowStockOnly {
		query += ` AND track_stock = 1 AND current_stock <= minimum_threshold`
	}

	query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*domain.Item
	for rows.Next() {
		var it domain.Item
		var (
			idStr, orgStr, catStr string
			sku                   sql.NullString
			unitCost              sql.NullFloat64
		)
		if err := rows.Scan(&idStr, &orgStr, &catStr, &it.Name, &sku,
			&it.UnitOfMeasurement, &it.MinimumThreshold, &it.CurrentStock,
			&unitCost, &it.IsActive, &it.TrackStock, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		it.ID, _ = uuid.Parse(idStr)
		it.OrganizationID, _ = uuid.Parse(orgStr)
		it.CategoryID, _ = uuid.Parse(catStr)
		if sku.Valid {
			it.SKU = &sku.String
		}
		if unitCost.Valid {
			it.UnitCost = &unitCost.Float64
		}
		items = append(items, &it)
	}

	return items, rows.Err()
}

func (r *itemRepoSQLite) Update(ctx context.Context, item *domain.Item) error {
	item.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE items SET
			name = ?, sku = ?, unit_of_measurement = ?,
			minimum_threshold = ?, current_stock = ?,
			unit_cost = ?, is_active = ?, track_stock = ?, category_id = ?, updated_at = ?
		WHERE id = ?
	`,
		item.Name, item.SKU, item.UnitOfMeasurement,
		item.MinimumThreshold, item.CurrentStock,
		item.UnitCost, item.IsActive, item.TrackStock, item.CategoryID.String(), item.UpdatedAt,
		item.ID.String(),
	)
	return err
}

func (r *itemRepoSQLite) UpdateStock(ctx context.Context, id uuid.UUID, newStock int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE items SET current_stock = ?, updated_at = ?
		WHERE id = ?
	`, newStock, time.Now().UTC(), id.String())
	return err
}

func (r *itemRepoSQLite) CountByCategory(ctx context.Context, categoryID uuid.UUID) (int, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM items WHERE category_id = ?
	`, categoryID.String())

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *itemRepoSQLite) ReassignCategory(ctx context.Context, fromCategoryID, toCategoryID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE items
		SET category_id = ?, updated_at = ?
		WHERE category_id = ?
	`, toCategoryID.String(), time.Now().UTC(), fromCategoryID.String())
	return err
}

func (r *itemRepoSQLite) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM items WHERE id = ?
	`, id.String())
	return err
}
