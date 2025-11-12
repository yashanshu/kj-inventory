package units

import (
	"errors"
	"fmt"
	"math"
)

var (
	ErrInvalidUnit     = errors.New("invalid unit")
	ErrNegativeValue   = errors.New("negative value not allowed")
	ErrInvalidBaseUnit = errors.New("invalid base unit value")
)

// Unit represents a measurement unit with its base unit conversion
type Unit struct {
	Code       string // "kg", "gm", "ltr", "pcs"
	Name       string // "Kilogram", "Gram", "Liter", "Pieces"
	BaseUnit   string // "g", "g", "ml", "pcs"
	Factor     int    // Conversion factor to base unit
	Precision  int    // Decimal places for display (e.g., 2 for 1.50 kg)
	AllowFloat bool   // Whether fractional values make sense
}

// Supported units with their properties
var SupportedUnits = map[string]Unit{
	"kg": {
		Code:       "kg",
		Name:       "Kilogram",
		BaseUnit:   "g",
		Factor:     1000,
		Precision:  3, // Allow up to 3 decimal places (0.001 kg = 1g precision)
		AllowFloat: true,
	},
	"gm": {
		Code:       "gm",
		Name:       "Gram",
		BaseUnit:   "g",
		Factor:     1,
		Precision:  0, // Whole grams only
		AllowFloat: false,
	},
	"ltr": {
		Code:       "ltr",
		Name:       "Liter",
		BaseUnit:   "ml",
		Factor:     1000,
		Precision:  3, // Allow up to 3 decimal places (0.001 ltr = 1ml precision)
		AllowFloat: true,
	},
	"pcs": {
		Code:       "pcs",
		Name:       "Pieces",
		BaseUnit:   "pcs",
		Factor:     1,
		Precision:  0, // Whole pieces only
		AllowFloat: false,
	},
}

// ToBaseUnit converts a display value to base unit (integer)
// Example: 1.5 kg → 1500 grams
func ToBaseUnit(value float64, unitCode string) (int, error) {
	if value < 0 {
		return 0, ErrNegativeValue
	}

	unit, ok := SupportedUnits[unitCode]
	if !ok {
		return 0, fmt.Errorf("%w: %s", ErrInvalidUnit, unitCode)
	}

	// Convert to base unit and round to nearest integer
	baseValue := value * float64(unit.Factor)
	return int(math.Round(baseValue)), nil
}

// FromBaseUnit converts base unit (integer) to display value (float64)
// Example: 1500 grams → 1.5 kg
func FromBaseUnit(baseValue int, unitCode string) (float64, error) {
	if baseValue < 0 {
		return 0, ErrNegativeValue
	}

	unit, ok := SupportedUnits[unitCode]
	if !ok {
		return 0, fmt.Errorf("%w: %s", ErrInvalidUnit, unitCode)
	}

	// Convert from base unit to display unit
	displayValue := float64(baseValue) / float64(unit.Factor)

	// Round to unit's precision
	multiplier := math.Pow(10, float64(unit.Precision))
	return math.Round(displayValue*multiplier) / multiplier, nil
}

// Validate checks if a unit code is valid
func Validate(unitCode string) error {
	if _, ok := SupportedUnits[unitCode]; !ok {
		return fmt.Errorf("%w: %s", ErrInvalidUnit, unitCode)
	}
	return nil
}

// GetUnit returns the unit configuration for a given code
func GetUnit(unitCode string) (Unit, error) {
	unit, ok := SupportedUnits[unitCode]
	if !ok {
		return Unit{}, fmt.Errorf("%w: %s", ErrInvalidUnit, unitCode)
	}
	return unit, nil
}

// ConvertBetweenUnits converts a value from one unit to another
// Example: 1500 grams (kg) → 1500 grams (gm)
func ConvertBetweenUnits(value float64, fromUnit, toUnit string) (float64, error) {
	// Convert to base unit first
	baseValue, err := ToBaseUnit(value, fromUnit)
	if err != nil {
		return 0, err
	}

	// Convert from base unit to target unit
	return FromBaseUnit(baseValue, toUnit)
}
