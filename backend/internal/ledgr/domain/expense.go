// Package domain defines the Ledgr module's core types, enums, and value objects.
// It has no external dependencies — no database, no HTTP, no other internal packages.
package domain

import "time"

// FundingSource identifies who provided the money for an expense.
type FundingSource string

const (
	FundingPersonal FundingSource = "personal"
	FundingPartner2 FundingSource = "partner2"
	FundingPartner3 FundingSource = "partner3"
	FundingPayout   FundingSource = "payout"
	FundingLoan     FundingSource = "loan"
)

func (f FundingSource) Valid() bool {
	switch f {
	case FundingPersonal, FundingPartner2, FundingPartner3, FundingPayout, FundingLoan:
		return true
	}
	return false
}

// IsPersonalFund returns true for funding sources that contribute to partner balances.
func (f FundingSource) IsPersonalFund() bool {
	return f == FundingPersonal || f == FundingPartner2 || f == FundingPartner3
}

// PaymentMethod describes how the expense was paid.
type PaymentMethod string

const (
	PaymentUPI   PaymentMethod = "upi"
	PaymentCard  PaymentMethod = "card"
	PaymentCash  PaymentMethod = "cash"
	PaymentNEFT  PaymentMethod = "neft"
	PaymentOther PaymentMethod = "other"
)

func (p PaymentMethod) Valid() bool {
	switch p {
	case PaymentUPI, PaymentCard, PaymentCash, PaymentNEFT, PaymentOther:
		return true
	}
	return false
}

// GSTRate is the applicable GST percentage as a string key matching the DB column.
type GSTRate string

const (
	GSTRate0  GSTRate = "0"
	GSTRate5  GSTRate = "5"
	GSTRate12 GSTRate = "12"
	GSTRate18 GSTRate = "18"
	GSTRate28 GSTRate = "28"
)

func (g GSTRate) Valid() bool {
	switch g {
	case GSTRate0, GSTRate5, GSTRate12, GSTRate18, GSTRate28:
		return true
	}
	return false
}

// EntryType distinguishes regular expenses from salary and partner settlement entries.
type EntryType string

const (
	EntryExpense    EntryType = "expense"
	EntrySalary     EntryType = "salary"
	EntrySettlement EntryType = "settlement"
)

func (e EntryType) Valid() bool {
	switch e {
	case EntryExpense, EntrySalary, EntrySettlement:
		return true
	}
	return false
}

// Expense is the central Ledgr aggregate. All monetary values are stored in paise
// (integer) to avoid floating-point rounding errors.
type Expense struct {
	ID            string        `json:"id"`
	OrgID         string        `json:"org_id"`
	StoreID       *string       `json:"store_id,omitempty"`
	Date          string        `json:"date"`          // YYYY-MM-DD
	AmountPaise   int64         `json:"amount_paise"`  // gross amount
	BasePaise     int64         `json:"base_paise"`    // pre-GST amount
	GSTRate       GSTRate       `json:"gst_rate"`
	CGSTPaise     int64         `json:"cgst_paise"`
	SGSTPaise     int64         `json:"sgst_paise"`
	IGSTPaise     int64         `json:"igst_paise"`
	GSTInclusive  bool          `json:"gst_inclusive"`
	IsInterstate  bool          `json:"is_interstate"`
	CategoryID    string        `json:"category_id"`
	FundingSource FundingSource `json:"funding_source"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	VendorName    *string       `json:"vendor_name,omitempty"`
	VendorGSTIN   *string       `json:"vendor_gstin,omitempty"`
	InvoiceNumber *string       `json:"invoice_number,omitempty"`
	HasInvoice    bool          `json:"has_invoice"`
	EntryType     EntryType     `json:"entry_type"`
	Description   *string       `json:"description,omitempty"`
	CreatedBy     string        `json:"created_by"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`

	// Populated on read when entry_type = salary
	SalaryDetails *SalaryDetails `json:"salary_details,omitempty"`
	// Populated on read
	Attachments []Attachment `json:"attachments,omitempty"`
}

// SalaryDetails holds the employee-specific sub-record for a salary entry.
type SalaryDetails struct {
	ID           string            `json:"id"`
	ExpenseID    string            `json:"expense_id"`
	EmployeeName string            `json:"employee_name"`
	GrossPaise   int64             `json:"gross_paise"`
	NetPaise     int64             `json:"net_paise"` // == expense.amount_paise
	Deductions   []SalaryDeduction `json:"deductions,omitempty"`
	CreatedAt    time.Time         `json:"created_at"`
}

// DeductionType categorises a salary deduction.
type DeductionType string

const (
	DeductionLeave   DeductionType = "leave"
	DeductionAdvance DeductionType = "advance"
	DeductionOther   DeductionType = "other"
)

// SalaryDeduction is one deduction row on a salary entry.
type SalaryDeduction struct {
	ID             string        `json:"id"`
	SalaryID       string        `json:"salary_id"`
	DeductionType  DeductionType `json:"deduction_type"`
	DeductionLabel *string       `json:"deduction_label,omitempty"` // free text for 'other'
	AmountPaise    int64         `json:"amount_paise"`
}

// Attachment is a receipt file linked to an expense.
type Attachment struct {
	ID         string    `json:"id"`
	ExpenseID  string    `json:"expense_id"`
	FileName   string    `json:"file_name"`
	FileType   string    `json:"file_type"` // image|pdf|screenshot
	FileURL    string    `json:"file_url"`
	FileSize   int64     `json:"file_size"` // bytes
	UploadedBy string    `json:"uploaded_by"`
	UploadedAt time.Time `json:"uploaded_at"`
}

// ExpenseFilters holds optional query parameters for listing expenses.
type ExpenseFilters struct {
	DateFrom      string
	DateTo        string
	CategoryID    string
	FundingSource FundingSource
	PaymentMethod PaymentMethod
	StoreID       string
	EntryType     EntryType
	Page          int
	PerPage       int
}

// CalendarDay is one cell in the month-view calendar summary.
type CalendarDay struct {
	Date        string   `json:"date"`         // YYYY-MM-DD
	State       DayState `json:"state"`
	EntryCount  int      `json:"entry_count"`
	TotalPaise  int64    `json:"total_paise"`
	BasePaise   int64    `json:"base_paise"`
	GSTPaise    int64    `json:"gst_paise"`
}

// WeekTotal is the sum for one ISO week row in the calendar.
type WeekTotal struct {
	WeekNumber int   `json:"week_number"`
	TotalPaise int64 `json:"total_paise"`
}

// CalendarSummary is the full response for GET /expenses/calendar/:year/:month.
type CalendarSummary struct {
	Year            int           `json:"year"`
	Month           int           `json:"month"`
	Days            []CalendarDay `json:"days"`
	WeekTotals      []WeekTotal   `json:"week_totals"`
	MonthTotalPaise int64         `json:"month_total_paise"`
}
