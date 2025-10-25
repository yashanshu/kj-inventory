package domain

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organizationId" db:"organization_id"`
	Name           string    `json:"name" db:"name" validate:"required,min=1,max=100"`
	Description    *string   `json:"description" db:"description"`
	Color          *string   `json:"color" db:"color"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time `json:"updatedAt" db:"updated_at"`
}
