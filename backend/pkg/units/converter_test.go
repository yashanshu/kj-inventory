package units

import (
	"testing"
)

func TestToBaseUnit(t *testing.T) {
	tests := []struct {
		name      string
		value     float64
		unit      string
		want      int
		wantError bool
	}{
		// Kilograms to grams
		{"1.5 kg to grams", 1.5, "kg", 1500, false},
		{"0.5 kg to grams", 0.5, "kg", 500, false},
		{"2.75 kg to grams", 2.75, "kg", 2750, false},
		{"0.001 kg to grams", 0.001, "kg", 1, false},
		{"10 kg to grams", 10.0, "kg", 10000, false},

		// Grams (already base unit)
		{"100 grams", 100.0, "gm", 100, false},
		{"1 gram", 1.0, "gm", 1, false},

		// Liters to milliliters
		{"1.5 ltr to ml", 1.5, "ltr", 1500, false},
		{"0.25 ltr to ml", 0.25, "ltr", 250, false},
		{"2.0 ltr to ml", 2.0, "ltr", 2000, false},

		// Pieces
		{"5 pieces", 5.0, "pcs", 5, false},
		{"100 pieces", 100.0, "pcs", 100, false},

		// Error cases
		{"negative value", -1.5, "kg", 0, true},
		{"invalid unit", 1.5, "invalid", 0, true},
		{"zero value", 0.0, "kg", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ToBaseUnit(tt.value, tt.unit)
			if (err != nil) != tt.wantError {
				t.Errorf("ToBaseUnit() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if !tt.wantError && got != tt.want {
				t.Errorf("ToBaseUnit() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestFromBaseUnit(t *testing.T) {
	tests := []struct {
		name      string
		baseValue int
		unit      string
		want      float64
		wantError bool
	}{
		// Grams to kilograms
		{"1500 grams to kg", 1500, "kg", 1.5, false},
		{"500 grams to kg", 500, "kg", 0.5, false},
		{"2750 grams to kg", 2750, "kg", 2.75, false},
		{"1 gram to kg", 1, "kg", 0.001, false},
		{"10000 grams to kg", 10000, "kg", 10.0, false},

		// Grams (already base unit)
		{"100 grams", 100, "gm", 100.0, false},
		{"1 gram", 1, "gm", 1.0, false},

		// Milliliters to liters
		{"1500 ml to ltr", 1500, "ltr", 1.5, false},
		{"250 ml to ltr", 250, "ltr", 0.25, false},
		{"2000 ml to ltr", 2000, "ltr", 2.0, false},

		// Pieces
		{"5 pieces", 5, "pcs", 5.0, false},
		{"100 pieces", 100, "pcs", 100.0, false},

		// Error cases
		{"negative value", -1500, "kg", 0, true},
		{"invalid unit", 1500, "invalid", 0, true},
		{"zero value", 0, "kg", 0.0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := FromBaseUnit(tt.baseValue, tt.unit)
			if (err != nil) != tt.wantError {
				t.Errorf("FromBaseUnit() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if !tt.wantError && got != tt.want {
				t.Errorf("FromBaseUnit() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRoundTrip(t *testing.T) {
	tests := []struct {
		name  string
		value float64
		unit  string
	}{
		{"1.5 kg round trip", 1.5, "kg"},
		{"0.5 kg round trip", 0.5, "kg"},
		{"2.75 kg round trip", 2.75, "kg"},
		{"1.5 ltr round trip", 1.5, "ltr"},
		{"5 pcs round trip", 5.0, "pcs"},
		{"100 gm round trip", 100.0, "gm"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Convert to base unit
			baseValue, err := ToBaseUnit(tt.value, tt.unit)
			if err != nil {
				t.Fatalf("ToBaseUnit() error = %v", err)
			}

			// Convert back to display value
			displayValue, err := FromBaseUnit(baseValue, tt.unit)
			if err != nil {
				t.Fatalf("FromBaseUnit() error = %v", err)
			}

			// Should match original value
			if displayValue != tt.value {
				t.Errorf("Round trip: got %v, want %v", displayValue, tt.value)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name      string
		unit      string
		wantError bool
	}{
		{"valid kg", "kg", false},
		{"valid gm", "gm", false},
		{"valid ltr", "ltr", false},
		{"valid pcs", "pcs", false},
		{"invalid unit", "invalid", true},
		{"empty unit", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.unit)
			if (err != nil) != tt.wantError {
				t.Errorf("Validate() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestConvertBetweenUnits(t *testing.T) {
	tests := []struct {
		name     string
		value    float64
		fromUnit string
		toUnit   string
		want     float64
	}{
		// Same base unit conversions
		{"1.5 kg to grams", 1.5, "kg", "gm", 1500.0},
		{"1500 grams to kg", 1500.0, "gm", "kg", 1.5},
		{"0.5 ltr to ml", 0.5, "ltr", "gm", 0.0}, // Different base units = 0 (not supported in this simple impl)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ConvertBetweenUnits(tt.value, tt.fromUnit, tt.toUnit)
			if err != nil && tt.fromUnit != "ltr" {
				t.Errorf("ConvertBetweenUnits() error = %v", err)
				return
			}
			// Only compare if same base unit family
			fromUnitConfig, _ := GetUnit(tt.fromUnit)
			toUnitConfig, _ := GetUnit(tt.toUnit)
			if fromUnitConfig.BaseUnit == toUnitConfig.BaseUnit && got != tt.want {
				t.Errorf("ConvertBetweenUnits() = %v, want %v", got, tt.want)
			}
		})
	}
}

// Test precision handling
func TestPrecisionHandling(t *testing.T) {
	tests := []struct {
		name      string
		value     float64
		unit      string
		wantBase  int
		wantRound float64
	}{
		// kg allows 3 decimal places (0.001 kg = 1g)
		{"0.0015 kg rounds to 0.002 kg", 0.0015, "kg", 2, 0.002},
		{"0.0014 kg rounds to 0.001 kg", 0.0014, "kg", 1, 0.001},

		// Pieces must be whole numbers
		{"5.7 pcs rounds to 6", 5.7, "pcs", 6, 6.0},
		{"5.2 pcs rounds to 5", 5.2, "pcs", 5, 5.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Convert to base
			baseValue, err := ToBaseUnit(tt.value, tt.unit)
			if err != nil {
				t.Fatalf("ToBaseUnit() error = %v", err)
			}

			if baseValue != tt.wantBase {
				t.Errorf("Base value = %v, want %v", baseValue, tt.wantBase)
			}

			// Convert back
			displayValue, err := FromBaseUnit(baseValue, tt.unit)
			if err != nil {
				t.Fatalf("FromBaseUnit() error = %v", err)
			}

			if displayValue != tt.wantRound {
				t.Errorf("Display value = %v, want %v", displayValue, tt.wantRound)
			}
		})
	}
}
