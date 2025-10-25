package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organizationId" db:"organization_id"`
	Email          string    `json:"email" db:"email" validate:"required,email"`
	PasswordHash   string    `json:"-" db:"password_hash"`
	FirstName      string    `json:"firstName" db:"first_name" validate:"required"`
	LastName       string    `json:"lastName" db:"last_name" validate:"required"`
	Role           UserRole  `json:"role" db:"role"`
	IsActive       bool      `json:"isActive" db:"is_active"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}

type UserRole string

const (
	RoleAdmin   UserRole = "ADMIN"
	RoleManager UserRole = "MANAGER"
	RoleUser    UserRole = "USER"
)
