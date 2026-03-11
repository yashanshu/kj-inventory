package domain

import (
	"time"

	"github.com/google/uuid"
)

type Store struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organizationId" db:"organization_id"`
	Name           string    `json:"name" db:"name"`
	Code           string    `json:"code" db:"code"`
	IsPrimary      bool      `json:"isPrimary" db:"is_primary"`
	IsActive       bool      `json:"isActive" db:"is_active"`
	Metadata       string    `json:"metadata" db:"metadata_json"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}

type CreateStoreRequest struct {
	Name      string `json:"name" validate:"required"`
	Code      string `json:"code" validate:"required"`
	IsPrimary bool   `json:"isPrimary"`
}

type UpdateStoreRequest struct {
	Name      *string `json:"name"`
	Code      *string `json:"code"`
	IsPrimary *bool   `json:"isPrimary"`
}
