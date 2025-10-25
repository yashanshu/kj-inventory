package domain

import (
	"time"

	"github.com/google/uuid"
)

type AlertType string

const (
	AlertTypeLowStock   AlertType = "LOW_STOCK"
	AlertTypeOutOfStock AlertType = "OUT_OF_STOCK"
)

type AlertSeverity string

const (
	AlertSeverityInfo     AlertSeverity = "INFO"
	AlertSeverityWarning  AlertSeverity = "WARNING"
	AlertSeverityCritical AlertSeverity = "CRITICAL"
)

type Alert struct {
	ID             uuid.UUID     `json:"id" db:"id"`
	OrganizationID uuid.UUID     `json:"organizationId" db:"organization_id"`
	ItemID         *uuid.UUID    `json:"itemId,omitempty" db:"item_id"`
	Type           AlertType     `json:"type" db:"type"`
	Severity       AlertSeverity `json:"severity" db:"severity"`
	Title          string        `json:"title" db:"title"`
	Message        string        `json:"message" db:"message"`
	IsRead         bool          `json:"isRead" db:"is_read"`
	CreatedAt      time.Time     `json:"createdAt" db:"created_at"`

	// Joined fields
	Item *Item `json:"item,omitempty"`
}
