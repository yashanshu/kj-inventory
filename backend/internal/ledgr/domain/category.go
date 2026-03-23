package domain

import "time"

// SystemCategories are the default MSME-relevant categories seeded for every new org.
// These categories have is_system = true and cannot be deleted.
var SystemCategories = []string{
	"Raw Materials",
	"Packaging",
	"Electricity & Utilities",
	"Rent",
	"Labour / Salary",
	"Fuel & Transport",
	"Platform Commissions",
	"Repairs & Maintenance",
	"Marketing & Promotions",
	"Taxes & Government Fees",
	"Software & Subscriptions",
	"Miscellaneous",
}

// Category is an expense classification owned by an org.
// System categories (is_system = true) are seeded at org setup and cannot be deleted.
type Category struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Name      string    `json:"name"`
	SortOrder int       `json:"sort_order"`
	IsHidden  bool      `json:"is_hidden"`
	IsSystem  bool      `json:"is_system"`
	CreatedAt time.Time `json:"created_at"`
}
