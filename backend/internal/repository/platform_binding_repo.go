package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

type platformBindingRepo struct {
	db *sql.DB
}

func NewPlatformBindingRepository(db *sql.DB) PlatformBindingRepository {
	return &platformBindingRepo{db: db}
}

func (r *platformBindingRepo) List(ctx context.Context, orgID uuid.UUID, storeID *uuid.UUID) ([]*domain.PlatformBinding, error) {
	query := `
		SELECT id, organization_id, store_id, platform, restaurant_id, restaurant_name, is_active, created_at, updated_at
		FROM platform_store_bindings
		WHERE organization_id = ?`
	args := []interface{}{orgID.String()}

	if storeID != nil {
		query += ` AND store_id = ?`
		args = append(args, storeID.String())
	}
	query += ` ORDER BY platform, restaurant_id`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bindings []*domain.PlatformBinding
	for rows.Next() {
		b, err := scanBinding(rows)
		if err != nil {
			return nil, err
		}
		bindings = append(bindings, b)
	}
	return bindings, rows.Err()
}

func (r *platformBindingRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.PlatformBinding, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, store_id, platform, restaurant_id, restaurant_name, is_active, created_at, updated_at
		FROM platform_store_bindings WHERE id = ?
	`, id.String())
	b, err := scanBindingRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (r *platformBindingRepo) GetByPlatformAndRestaurantID(ctx context.Context, platform, restaurantID string) (*domain.PlatformBinding, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, store_id, platform, restaurant_id, restaurant_name, is_active, created_at, updated_at
		FROM platform_store_bindings WHERE platform = ? AND restaurant_id = ?
	`, platform, restaurantID)
	b, err := scanBindingRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (r *platformBindingRepo) Create(ctx context.Context, b *domain.PlatformBinding) (uuid.UUID, error) {
	b.ID = uuid.New() // must supply — no DB default on this table
	now := time.Now().UTC()
	b.CreatedAt = now
	b.UpdatedAt = now
	b.IsActive = true

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO platform_store_bindings
			(id, organization_id, store_id, platform, restaurant_id, restaurant_name, is_active, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, b.ID.String(), b.OrganizationID.String(), b.StoreID.String(),
		b.Platform, b.RestaurantID, b.RestaurantName, b.IsActive, b.CreatedAt, b.UpdatedAt)
	if err != nil {
		return uuid.Nil, err
	}
	return b.ID, nil
}

func (r *platformBindingRepo) Update(ctx context.Context, b *domain.PlatformBinding) error {
	b.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE platform_store_bindings SET restaurant_name = ?, is_active = ?, updated_at = ?
		WHERE id = ?
	`, b.RestaurantName, b.IsActive, b.UpdatedAt, b.ID.String())
	return err
}

func (r *platformBindingRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM platform_store_bindings WHERE id = ?`, id.String())
	return err
}

// ---- scan helpers ----

type bindingScanner interface {
	Scan(dest ...any) error
}

func scanBinding(s bindingScanner) (*domain.PlatformBinding, error) {
	var b domain.PlatformBinding
	var idStr, orgStr, storeStr string
	var restaurantName sql.NullString
	err := s.Scan(&idStr, &orgStr, &storeStr, &b.Platform, &b.RestaurantID, &restaurantName, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	b.ID, _ = uuid.Parse(idStr)
	b.OrganizationID, _ = uuid.Parse(orgStr)
	b.StoreID, _ = uuid.Parse(storeStr)
	if restaurantName.Valid {
		b.RestaurantName = &restaurantName.String
	}
	return &b, nil
}

func scanBindingRow(row *sql.Row) (*domain.PlatformBinding, error) {
	var b domain.PlatformBinding
	var idStr, orgStr, storeStr string
	var restaurantName sql.NullString
	err := row.Scan(&idStr, &orgStr, &storeStr, &b.Platform, &b.RestaurantID, &restaurantName, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		return nil, err
	}
	b.ID, _ = uuid.Parse(idStr)
	b.OrganizationID, _ = uuid.Parse(orgStr)
	b.StoreID, _ = uuid.Parse(storeStr)
	if restaurantName.Valid {
		b.RestaurantName = &restaurantName.String
	}
	return &b, nil
}
