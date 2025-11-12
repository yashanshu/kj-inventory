package domain

import (
	"hasufel.kj/pkg/units"
)

// ItemDisplay represents an item with display-friendly values
// Stock values are converted from base units to display units
type ItemDisplay struct {
	ID                string   `json:"id"`
	OrganizationID    string   `json:"organizationId"`
	CategoryID        string   `json:"categoryId"`
	Name              string   `json:"name"`
	SKU               *string  `json:"sku"`
	UnitOfMeasurement string   `json:"unit"`
	MinimumThreshold  float64  `json:"minimumThreshold"` // Converted to display unit
	CurrentStock      float64  `json:"currentStock"`      // Converted to display unit
	UnitCost          *float64 `json:"unitCost"`
	IsActive          bool     `json:"isActive"`
	TrackStock        bool     `json:"trackStock"`
	CreatedAt         string   `json:"createdAt"`
	UpdatedAt         string   `json:"updatedAt"`
	Category          *Category `json:"category,omitempty"`
}

// ToDisplay converts an Item from base units to display units
func (i *Item) ToDisplay() (*ItemDisplay, error) {
	// Convert stock values from base unit to display unit
	displayStock, err := units.FromBaseUnit(i.CurrentStock, i.UnitOfMeasurement)
	if err != nil {
		return nil, err
	}

	displayThreshold, err := units.FromBaseUnit(i.MinimumThreshold, i.UnitOfMeasurement)
	if err != nil {
		return nil, err
	}

	return &ItemDisplay{
		ID:                i.ID.String(),
		OrganizationID:    i.OrganizationID.String(),
		CategoryID:        i.CategoryID.String(),
		Name:              i.Name,
		SKU:               i.SKU,
		UnitOfMeasurement: i.UnitOfMeasurement,
		MinimumThreshold:  displayThreshold,
		CurrentStock:      displayStock,
		UnitCost:          i.UnitCost,
		IsActive:          i.IsActive,
		TrackStock:        i.TrackStock,
		CreatedAt:         i.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:         i.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Category:          i.Category,
	}, nil
}

// GetDisplayStock returns the current stock in display units
func (i *Item) GetDisplayStock() (float64, error) {
	return units.FromBaseUnit(i.CurrentStock, i.UnitOfMeasurement)
}

// GetDisplayThreshold returns the minimum threshold in display units
func (i *Item) GetDisplayThreshold() (float64, error) {
	return units.FromBaseUnit(i.MinimumThreshold, i.UnitOfMeasurement)
}

// SetStockFromDisplay sets the current stock from a display value
func (i *Item) SetStockFromDisplay(displayValue float64) error {
	baseValue, err := units.ToBaseUnit(displayValue, i.UnitOfMeasurement)
	if err != nil {
		return err
	}
	i.CurrentStock = baseValue
	return nil
}

// SetThresholdFromDisplay sets the minimum threshold from a display value
func (i *Item) SetThresholdFromDisplay(displayValue float64) error {
	baseValue, err := units.ToBaseUnit(displayValue, i.UnitOfMeasurement)
	if err != nil {
		return err
	}
	i.MinimumThreshold = baseValue
	return nil
}

// CreateItemRequestDisplay represents the API request with display values
type CreateItemRequestDisplay struct {
	CategoryID        string   `json:"categoryId" validate:"required"`
	Name              string   `json:"name" validate:"required,min=1,max=255"`
	SKU               *string  `json:"sku"`
	UnitOfMeasurement string   `json:"unit" validate:"required"`
	MinimumThreshold  float64  `json:"minimumThreshold" validate:"gte=0"`
	CurrentStock      float64  `json:"currentStock" validate:"gte=0"`
	UnitCost          *float64 `json:"unitCost"`
	TrackStock        *bool    `json:"trackStock"`
}

// UpdateItemRequestDisplay represents the API update request with display values
type UpdateItemRequestDisplay struct {
	Name              *string  `json:"name" validate:"omitempty,min=1,max=255"`
	SKU               *string  `json:"sku"`
	UnitOfMeasurement *string  `json:"unit"`
	MinimumThreshold  *float64 `json:"minimumThreshold" validate:"omitempty,gte=0"`
	UnitCost          *float64 `json:"unitCost"`
	CategoryID        *string  `json:"categoryId"`
	TrackStock        *bool    `json:"trackStock"`
	IsActive          *bool    `json:"isActive"`
}
