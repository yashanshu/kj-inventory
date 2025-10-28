package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

func NewCategoryRepository(db *sql.DB) CategoryRepository {
	return &categoryRepoSQLite{db: db}
}

type categoryRepoSQLite struct {
	db *sql.DB
}

func (r *categoryRepoSQLite) Create(ctx context.Context, category *domain.Category) (uuid.UUID, error) {
	if category == nil {
		return uuid.Nil, errors.New("category is nil")
	}

	if category.ID == uuid.Nil {
		category.ID = uuid.New()
	}
	now := time.Now().UTC()
	category.CreatedAt = now
	category.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO categories (
			id, organization_id, name, description, color,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?)
	`,
		category.ID.String(), category.OrganizationID.String(),
		category.Name, category.Description, category.Color,
		category.CreatedAt, category.UpdatedAt,
	)
	if err != nil {
		return uuid.Nil, err
	}
	return category.ID, nil
}

func (r *categoryRepoSQLite) GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, name, description, color,
		       created_at, updated_at
		FROM categories WHERE id = ?
	`, id.String())

	var cat domain.Category
	var (
		idStr, orgStr      string
		description, color sql.NullString
	)

	if err := row.Scan(
		&idStr, &orgStr, &cat.Name, &description, &color,
		&cat.CreatedAt, &cat.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	cat.ID, _ = uuid.Parse(idStr)
	cat.OrganizationID, _ = uuid.Parse(orgStr)
	if description.Valid {
		cat.Description = &description.String
	}
	if color.Valid {
		cat.Color = &color.String
	}

	return &cat, nil
}

func (r *categoryRepoSQLite) List(ctx context.Context, orgID uuid.UUID) ([]*domain.Category, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, name, description, color,
		       created_at, updated_at
		FROM categories
		WHERE organization_id = ?
		ORDER BY sort_order, name
	`, orgID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*domain.Category
	for rows.Next() {
		var cat domain.Category
		var (
			idStr, orgStr      string
			description, color sql.NullString
		)

		if err := rows.Scan(
			&idStr, &orgStr, &cat.Name, &description, &color,
			&cat.CreatedAt, &cat.UpdatedAt,
		); err != nil {
			return nil, err
		}

		cat.ID, _ = uuid.Parse(idStr)
		cat.OrganizationID, _ = uuid.Parse(orgStr)
		if description.Valid {
			cat.Description = &description.String
		}
		if color.Valid {
			cat.Color = &color.String
		}
		categories = append(categories, &cat)
	}

	return categories, rows.Err()
}

func (r *categoryRepoSQLite) Update(ctx context.Context, category *domain.Category) error {
	category.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE categories SET
			name = ?, description = ?, color = ?, updated_at = ?
		WHERE id = ?
	`,
		category.Name, category.Description, category.Color,
		category.UpdatedAt, category.ID.String(),
	)
	return err
}

func (r *categoryRepoSQLite) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM categories WHERE id = ?
	`, id.String())
	return err
}
