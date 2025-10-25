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
	ID            uuid.UUID    `json:"id" db:"id"`
	ItemID        uuid.UUID    `json:"itemId" db:"item_id"`
	MovementType  MovementType `json:"movementType" db:"movement_type" validate:"required"`
	Quantity      int          `json:"quantity" db:"quantity" validate:"required"`
	PreviousStock int          `json:"previousStock" db:"previous_stock"`
	NewStock      int          `json:"newStock" db:"new_stock"`
	Reference     *string      `json:"reference" db:"reference"`
	Notes         *string      `json:"notes" db:"notes"`
	CreatedBy     uuid.UUID    `json:"createdBy" db:"created_by"`
	CreatedAt     time.Time    `json:"createdAt" db:"created_at"`

	// Joined fields
	Item *Item `json:"item,omitempty"`
}

type CreateMovementRequest struct {
	ItemID       uuid.UUID    `json:"itemId" validate:"required"`
	MovementType MovementType `json:"movementType" validate:"required"`
	Quantity     int          `json:"quantity" validate:"required"`
	Reference    *string      `json:"reference"`
	Notes        *string      `json:"notes"`
}
