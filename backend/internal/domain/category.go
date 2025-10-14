package domain

import (
	"time"

	"github.com/google/uuid"
)

type Category struct {
	ID             uuid.UUID `json:"id" db:"id"`
	OrganizationID uuid.UUID `json:"organization_id" db:"organization_id"`
	Name           string    `json:"name" db:"name" validate:"required,min=1,max=100"`
	Description    *string   `json:"description" db:"description"`
	Color          *string   `json:"color" db:"color"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
