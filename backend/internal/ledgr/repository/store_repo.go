package repository

import (
	"context"
	"database/sql"
)

// NewStoreRepository returns a read-only StoreRepository backed by the shared stores table.
func NewStoreRepository(db *sql.DB) StoreRepository {
	return &storeRepo{db: db}
}

type storeRepo struct {
	db *sql.DB
}

func (r *storeRepo) ListByOrg(ctx context.Context, orgID string) ([]StoreRow, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, code, is_primary
		FROM stores
		WHERE organization_id = ? AND is_active = 1
		ORDER BY is_primary DESC, name
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []StoreRow
	for rows.Next() {
		var s StoreRow
		var isPrimary int
		if err := rows.Scan(&s.ID, &s.Name, &s.Code, &isPrimary); err != nil {
			return nil, err
		}
		s.IsPrimary = isPrimary == 1
		result = append(result, s)
	}
	return result, rows.Err()
}
