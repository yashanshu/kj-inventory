package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
)

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepoSQLite{db: db}
}

type userRepoSQLite struct {
	db *sql.DB
}

func (r *userRepoSQLite) Create(ctx context.Context, user *domain.User) (uuid.UUID, error) {
	if user == nil {
		return uuid.Nil, errors.New("user is nil")
	}

	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users (
			id, organization_id, default_store_id, user_id, email, password_hash,
			first_name, last_name, role, is_active,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		user.ID.String(), user.OrganizationID.String(), nullableUUIDString(user.DefaultStoreID), user.UserID, user.Email,
		user.PasswordHash, user.FirstName, user.LastName,
		user.Role, user.IsActive, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		return uuid.Nil, err
	}
	return user.ID, nil
}

func (r *userRepoSQLite) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, default_store_id, user_id, email, password_hash,
		       first_name, last_name, role, is_active,
		       created_at, updated_at
		FROM users WHERE id = ?
	`, id.String())

	var user domain.User
	var idStr, orgStr string
	var defaultStoreStr sql.NullString

	if err := row.Scan(
		&idStr, &orgStr, &defaultStoreStr, &user.UserID, &user.Email, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.Role, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	user.ID, _ = uuid.Parse(idStr)
	user.OrganizationID, _ = uuid.Parse(orgStr)
	if defaultStoreStr.Valid {
		storeID, _ := uuid.Parse(defaultStoreStr.String)
		user.DefaultStoreID = &storeID
	}

	return &user, nil
}

func (r *userRepoSQLite) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, default_store_id, user_id, email, password_hash,
		       first_name, last_name, role, is_active,
		       created_at, updated_at
		FROM users WHERE email = ?
	`, email)

	var user domain.User
	var idStr, orgStr string
	var defaultStoreStr sql.NullString

	if err := row.Scan(
		&idStr, &orgStr, &defaultStoreStr, &user.UserID, &user.Email, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.Role, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	user.ID, _ = uuid.Parse(idStr)
	user.OrganizationID, _ = uuid.Parse(orgStr)
	if defaultStoreStr.Valid {
		storeID, _ := uuid.Parse(defaultStoreStr.String)
		user.DefaultStoreID = &storeID
	}

	return &user, nil
}

func (r *userRepoSQLite) GetByUserID(ctx context.Context, userID string) (*domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, organization_id, default_store_id, user_id, email, password_hash,
		       first_name, last_name, role, is_active,
		       created_at, updated_at
		FROM users WHERE user_id = ?
	`, userID)

	var user domain.User
	var idStr, orgStr string
	var defaultStoreStr sql.NullString

	if err := row.Scan(
		&idStr, &orgStr, &defaultStoreStr, &user.UserID, &user.Email, &user.PasswordHash,
		&user.FirstName, &user.LastName, &user.Role, &user.IsActive,
		&user.CreatedAt, &user.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	user.ID, _ = uuid.Parse(idStr)
	user.OrganizationID, _ = uuid.Parse(orgStr)
	if defaultStoreStr.Valid {
		storeID, _ := uuid.Parse(defaultStoreStr.String)
		user.DefaultStoreID = &storeID
	}

	return &user, nil
}

func (r *userRepoSQLite) List(ctx context.Context, orgID uuid.UUID) ([]*domain.User, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, organization_id, default_store_id, user_id, email, password_hash,
		       first_name, last_name, role, is_active,
		       created_at, updated_at
		FROM users
		WHERE organization_id = ?
		ORDER BY created_at DESC
	`, orgID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.User
	for rows.Next() {
		var user domain.User
		var idStr, orgStr string
		var defaultStoreStr sql.NullString

		if err := rows.Scan(
			&idStr, &orgStr, &defaultStoreStr, &user.UserID, &user.Email, &user.PasswordHash,
			&user.FirstName, &user.LastName, &user.Role, &user.IsActive,
			&user.CreatedAt, &user.UpdatedAt,
		); err != nil {
			return nil, err
		}

		user.ID, _ = uuid.Parse(idStr)
		user.OrganizationID, _ = uuid.Parse(orgStr)
		if defaultStoreStr.Valid {
			storeID, _ := uuid.Parse(defaultStoreStr.String)
			user.DefaultStoreID = &storeID
		}
		users = append(users, &user)
	}

	return users, rows.Err()
}

func (r *userRepoSQLite) Update(ctx context.Context, user *domain.User) error {
	user.UpdatedAt = time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET
			default_store_id = ?, user_id = ?, email = ?, first_name = ?, last_name = ?,
			role = ?, is_active = ?, updated_at = ?
		WHERE id = ?
	`,
		nullableUUIDString(user.DefaultStoreID), user.UserID, user.Email, user.FirstName, user.LastName,
		user.Role, user.IsActive, user.UpdatedAt,
		user.ID.String(),
	)
	return err
}

func nullableUUIDString(id *uuid.UUID) interface{} {
	if id == nil {
		return nil
	}
	return id.String()
}
