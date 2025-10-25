package domain

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID                uuid.UUID `json:"id" db:"id"`
	OrganizationID    uuid.UUID `json:"organizationId" db:"organization_id"`
	CategoryID        uuid.UUID `json:"categoryId" db:"category_id"`
	Name              string    `json:"name" db:"name" validate:"required,min=1,max=255"`
	SKU               *string   `json:"sku" db:"sku"`
	UnitOfMeasurement string    `json:"unit" db:"unit_of_measurement" validate:"required"`
	MinimumThreshold  int       `json:"minimumThreshold" db:"minimum_threshold" validate:"gte=0"`
	CurrentStock      int       `json:"currentStock" db:"current_stock" validate:"gte=0"`
	UnitCost          *float64  `json:"unitCost" db:"unit_cost"`
	IsActive          bool      `json:"isActive" db:"is_active"`
	TrackStock        bool      `json:"trackStock" db:"track_stock"`
	CreatedAt         time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt         time.Time `json:"updatedAt" db:"updated_at"`

	// Joined fields
	Category *Category `json:"category,omitempty"`
}

// Request/Response DTOs
type CreateItemRequest struct {
	CategoryID        uuid.UUID `json:"categoryId" validate:"required"`
	Name              string    `json:"name" validate:"required,min=1,max=255"`
	SKU               *string   `json:"sku"`
	UnitOfMeasurement string    `json:"unit" validate:"required"`
	MinimumThreshold  int       `json:"minimumThreshold" validate:"gte=0"`
	CurrentStock      int       `json:"currentStock" validate:"gte=0"`
	UnitCost          *float64  `json:"unitCost"`
	TrackStock        *bool     `json:"trackStock"`
}

type UpdateItemRequest struct {
	Name              *string    `json:"name" validate:"omitempty,min=1,max=255"`
	SKU               *string    `json:"sku"`
	UnitOfMeasurement *string    `json:"unit"`
	MinimumThreshold  *int       `json:"minimumThreshold" validate:"omitempty,gte=0"`
	UnitCost          *float64   `json:"unitCost"`
	CategoryID        *uuid.UUID `json:"categoryId"`
	TrackStock        *bool      `json:"trackStock"`
	IsActive          *bool      `json:"isActive"`
}

type BulkAdjustRequest struct {
	Adjustments []struct {
		ItemID   uuid.UUID `json:"itemId" validate:"required"`
		Quantity int       `json:"quantity" validate:"required"`
		Notes    *string   `json:"notes"`
	} `json:"adjustments" validate:"required,min=1"`
}
