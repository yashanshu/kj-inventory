package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`
	Email          string    `json:"email" db:"email" validate:"required,email"`
	PasswordHash   string    `json:"-" db:"password_hash"`
	FirstName      string    `json:"first_name" db:"first_name" validate:"required"`
	LastName       string    `json:"last_name" db:"last_name" validate:"required"`
	Role           UserRole  `json:"role" db:"role"`
	IsActive       bool      `json:"is_active" db:"is_active"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

type UserRole string

const (
	RoleAdmin   UserRole = "ADMIN"
	RoleManager UserRole = "MANAGER"
	RoleUser    UserRole = "USER"
)
