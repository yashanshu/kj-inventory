package domain

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID                uuid.UUID `json:"id" db:"id"`
	OrganizationID    uuid.UUID `json:"organization_id" db:"organization_id"`
	CategoryID        uuid.UUID `json:"category_id" db:"category_id"`
	Name              string    `json:"name" db:"name" validate:"required,min=1,max=255"`
	SKU               *string   `json:"sku" db:"sku"`
	UnitOfMeasurement string    `json:"unit_of_measurement" db:"unit_of_measurement" validate:"required"`
	MinimumThreshold  int       `json:"minimum_threshold" db:"minimum_threshold" validate:"gte=0"`
	CurrentStock      int       `json:"current_stock" db:"current_stock" validate:"gte=0"`
	UnitCost          *float64  `json:"unit_cost" db:"unit_cost"`
	IsActive          bool      `json:"is_active" db:"is_active"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	Category *Category `json:"category,omitempty"`
}

// Request/Response DTOs
type CreateItemRequest struct {
	CategoryID        uuid.UUID `json:"category_id" validate:"required"`
	Name              string    `json:"name" validate:"required,min=1,max=255"`
	SKU               *string   `json:"sku"`
	UnitOfMeasurement string    `json:"unit_of_measurement" validate:"required"`
	MinimumThreshold  int       `json:"minimum_threshold" validate:"gte=0"`
	CurrentStock      int       `json:"current_stock" validate:"gte=0"`
	UnitCost          *float64  `json:"unit_cost"`
}

type UpdateItemRequest struct {
	Name              *string  `json:"name" validate:"omitempty,min=1,max=255"`
	SKU               *string  `json:"sku"`
	UnitOfMeasurement *string  `json:"unit_of_measurement"`
	MinimumThreshold  *int     `json:"minimum_threshold" validate:"omitempty,gte=0"`
	UnitCost          *float64 `json:"unit_cost"`
}

type BulkAdjustRequest struct {
	Adjustments []struct {
		ItemID   uuid.UUID `json:"item_id" validate:"required"`
		Quantity int       `json:"quantity" validate:"required"`
		Notes    *string   `json:"notes"`
	} `json:"adjustments" validate:"required,min=1"`
}
