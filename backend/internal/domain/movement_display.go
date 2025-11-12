package domain

import (
	"hasufel.kj/pkg/units"
)

// StockMovementDisplay represents a stock movement with display-friendly values
type StockMovementDisplay struct {
	ID            string       `json:"id"`
	ItemID        string       `json:"itemId"`
	MovementType  MovementType `json:"movementType"`
	Quantity      float64      `json:"quantity"`      // Converted to display unit
	PreviousStock float64      `json:"previousStock"` // Converted to display unit
	NewStock      float64      `json:"newStock"`      // Converted to display unit
	Reference     *string      `json:"reference"`
	Notes         *string      `json:"notes"`
	CreatedBy     string       `json:"createdBy"`
	CreatedAt     string       `json:"createdAt"`
	Item          *ItemDisplay `json:"item,omitempty"`
}

// ToDisplay converts a StockMovement from base units to display units
// Requires the unit of measurement to perform conversion
func (sm *StockMovement) ToDisplay(unitOfMeasurement string) (*StockMovementDisplay, error) {
	// Convert quantities from base unit to display unit
	displayQuantity, err := units.FromBaseUnit(sm.Quantity, unitOfMeasurement)
	if err != nil {
		return nil, err
	}

	displayPreviousStock, err := units.FromBaseUnit(sm.PreviousStock, unitOfMeasurement)
	if err != nil {
		return nil, err
	}

	displayNewStock, err := units.FromBaseUnit(sm.NewStock, unitOfMeasurement)
	if err != nil {
		return nil, err
	}

	display := &StockMovementDisplay{
		ID:            sm.ID.String(),
		ItemID:        sm.ItemID.String(),
		MovementType:  sm.MovementType,
		Quantity:      displayQuantity,
		PreviousStock: displayPreviousStock,
		NewStock:      displayNewStock,
		Reference:     sm.Reference,
		Notes:         sm.Notes,
		CreatedBy:     sm.CreatedBy.String(),
		CreatedAt:     sm.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Convert joined item if present
	if sm.Item != nil {
		itemDisplay, err := sm.Item.ToDisplay()
		if err != nil {
			return nil, err
		}
		display.Item = itemDisplay
	}

	return display, nil
}

// CreateMovementRequestDisplay represents the API request with display values
type CreateMovementRequestDisplay struct {
	ItemID       string       `json:"itemId" validate:"required"`
	MovementType MovementType `json:"movementType" validate:"required"`
	Quantity     float64      `json:"quantity" validate:"required"`
	Reference    *string      `json:"reference"`
	Notes        *string      `json:"notes"`
}
