package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

type storeRepo struct {
	db *sql.DB
}

func NewStoreRepository(db *sql.DB) StoreRepository {
	return &storeRepo{db: db}
}

func (r *storeRepo) List(ctx context.Context, orgID uuid.UUID) ([]*domain.Store, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, name, code, is_primary, is_active, metadata_json, created_at, updated_at
		FROM stores
		WHERE organization_id = ? AND is_active = true
		ORDER BY is_primary DESC, name ASC
	`, orgID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []*domain.Store
	for rows.Next() {
		s, err := scanStore(rows)
		if err != nil {
			return nil, err
		}
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func (r *storeRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Store, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, name, code, is_primary, is_active, metadata_json, created_at, updated_at
		FROM stores WHERE id = ?
	`, id.String())

	s, err := scanStoreRow(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *storeRepo) Create(ctx context.Context, store *domain.Store) (uuid.UUID, error) {
	if store.ID == uuid.Nil {
		store.ID = uuid.New()
	}
	now := time.Now().UTC()
	store.CreatedAt = now
	store.UpdatedAt = now
	store.IsActive = true

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO stores (id, organization_id, name, code, is_primary, is_active, metadata_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, store.ID.String(), store.OrganizationID.String(), store.Name, store.Code,
		store.IsPrimary, store.IsActive, store.Metadata, store.CreatedAt, store.UpdatedAt)
	if err != nil {
		return uuid.Nil, err
	}
	return store.ID, nil
}

func (r *storeRepo) Update(ctx context.Context, store *domain.Store) error {
	store.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE stores SET name = ?, code = ?, is_primary = ?, updated_at = ?
		WHERE id = ?
	`, store.Name, store.Code, store.IsPrimary, store.UpdatedAt, store.ID.String())
	return err
}

func (r *storeRepo) SetPrimary(ctx context.Context, orgID, storeID uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE stores SET is_primary = false WHERE organization_id = ?`,
		orgID.String(),
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx,
		`UPDATE stores SET is_primary = true WHERE id = ?`,
		storeID.String(),
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *storeRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE stores SET is_active = false, updated_at = ? WHERE id = ?`,
		time.Now().UTC(), id.String(),
	)
	return err
}

// ---- scan helpers ----

type storeScanner interface {
	Scan(dest ...any) error
}

func scanStore(s storeScanner) (*domain.Store, error) {
	var st domain.Store
	var idStr, orgStr string
	var meta sql.NullString
	err := s.Scan(&idStr, &orgStr, &st.Name, &st.Code, &st.IsPrimary, &st.IsActive, &meta, &st.CreatedAt, &st.UpdatedAt)
	if err != nil {
		return nil, err
	}
	st.ID, _ = uuid.Parse(idStr)
	st.OrganizationID, _ = uuid.Parse(orgStr)
	if meta.Valid {
		st.Metadata = meta.String
	} else {
		st.Metadata = "{}"
	}
	return &st, nil
}

func scanStoreRow(row *sql.Row) (*domain.Store, error) {
	var st domain.Store
	var idStr, orgStr string
	var meta sql.NullString
	err := row.Scan(&idStr, &orgStr, &st.Name, &st.Code, &st.IsPrimary, &st.IsActive, &meta, &st.CreatedAt, &st.UpdatedAt)
	if err != nil {
		return nil, err
	}
	st.ID, _ = uuid.Parse(idStr)
	st.OrganizationID, _ = uuid.Parse(orgStr)
	if meta.Valid {
		st.Metadata = meta.String
	} else {
		st.Metadata = "{}"
	}
	return &st, nil
}
