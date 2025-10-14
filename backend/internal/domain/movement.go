package domain

import (
	"time"

	"github.com/google/uuid"
)

type MovementType string

const (
	MovementTypeIn         MovementType = "IN"
	MovementTypeOut        MovementType = "OUT"
	MovementTypeAdjustment MovementType = "ADJUSTMENT"
)

type StockMovement struct {
	ID           uuid.UUID    `json:"id" db:"id"`
	ItemID       uuid.UUID    `json:"item_id" db:"item_id"`
	MovementType MovementType `json:"movement_type" db:"movement_type" validate:"required"`
	Quantity     int          `json:"quantity" db:"quantity" validate:"required"`
	Reference    *string      `json:"reference" db:"reference"`
	Notes        *string      `json:"notes" db:"notes"`
	CreatedBy    uuid.UUID    `json:"created_by" db:"created_by"`
	CreatedAt    time.Time    `json:"created_at" db:"created_at"`

	// Joined fields
	Item *Item `json:"item,omitempty"`
}

type CreateMovementRequest struct {
	ItemID       uuid.UUID    `json:"item_id" validate:"required"`
	MovementType MovementType `json:"movement_type" validate:"required"`
	Quantity     int          `json:"quantity" validate:"required"`
	Reference    *string      `json:"reference"`
	Notes        *string      `json:"notes"`
}
