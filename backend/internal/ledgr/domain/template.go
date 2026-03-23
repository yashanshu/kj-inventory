package domain

import "time"

// Template is a saved recurring expense preset. Using a template pre-fills the
// Quick Add form; it does not auto-create entries.
type Template struct {
	ID            string        `json:"id"`
	OrgID         string        `json:"org_id"`
	Name          string        `json:"name"`
	CategoryID    string        `json:"category_id"`
	AmountPaise   *int64        `json:"amount_paise,omitempty"` // nil = amount varies
	FundingSource FundingSource `json:"funding_source"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	GSTRate       GSTRate       `json:"gst_rate"`
	GSTInclusive  bool          `json:"gst_inclusive"`
	StoreID       *string       `json:"store_id,omitempty"`
	Description   *string       `json:"description,omitempty"`
	SortOrder     int           `json:"sort_order"`
	CreatedAt     time.Time     `json:"created_at"`
}
