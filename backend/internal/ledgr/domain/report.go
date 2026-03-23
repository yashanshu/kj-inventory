package domain

// PLReport is the Profit & Loss summary for a date range.
type PLReport struct {
	DateFrom         string            `json:"date_from"`
	DateTo           string            `json:"date_to"`
	TotalPaise       int64             `json:"total_paise"`
	TotalGSTPaise    int64             `json:"total_gst_paise"`
	NetPaise         int64             `json:"net_paise"` // total - gst (estimated input credit)
	ByCategory       []CategoryTotal   `json:"by_category"`
	ByFundingSource  []FundingTotal    `json:"by_funding_source"`
}

// CategoryTotal is one row in the P&L by-category breakdown.
type CategoryTotal struct {
	CategoryID   string `json:"category_id"`
	CategoryName string `json:"category_name"`
	TotalPaise   int64  `json:"total_paise"`
	EntryCount   int    `json:"entry_count"`
}

// FundingTotal is one row in the P&L by-funding-source breakdown.
type FundingTotal struct {
	FundingSource FundingSource `json:"funding_source"`
	TotalPaise    int64         `json:"total_paise"`
}

// GSTSummary aggregates GST by rate for GSTR-3B filing.
type GSTSummary struct {
	DateFrom string      `json:"date_from"`
	DateTo   string      `json:"date_to"`
	Rows     []GSTRow    `json:"rows"`
	Totals   GSTTotals   `json:"totals"`
}

// GSTRow is one rate band in the GST summary.
type GSTRow struct {
	GSTRate        GSTRate `json:"gst_rate"`
	TaxablePaise   int64   `json:"taxable_paise"`
	CGSTPaise      int64   `json:"cgst_paise"`
	SGSTPaise      int64   `json:"sgst_paise"`
	IGSTPaise      int64   `json:"igst_paise"`
	TotalGSTPaise  int64   `json:"total_gst_paise"`
}

// GSTTotals is the grand total row of the GST summary.
type GSTTotals struct {
	TaxablePaise  int64 `json:"taxable_paise"`
	CGSTPaise     int64 `json:"cgst_paise"`
	SGSTPaise     int64 `json:"sgst_paise"`
	IGSTPaise     int64 `json:"igst_paise"`
	TotalGSTPaise int64 `json:"total_gst_paise"`
}

// PartnerReport is the per-partner settlement report.
type PartnerReport struct {
	DateFrom string               `json:"date_from"`
	DateTo   string               `json:"date_to"`
	Partners []PartnerReportEntry `json:"partners"`
}

// PartnerReportEntry is one partner's row in the settlement report.
type PartnerReportEntry struct {
	FundingSource    FundingSource `json:"funding_source"`
	TotalSpentPaise  int64         `json:"total_spent_paise"`
	TotalSettledPaise int64        `json:"total_settled_paise"`
	NetOwedPaise     int64         `json:"net_owed_paise"`
}
