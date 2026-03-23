package domain

// PartnerBalance is the computed balance owed to one partner.
// It is derived from expenses (personal funding sources) and settlements.
type PartnerBalance struct {
	FundingSource  FundingSource `json:"funding_source"`
	TotalSpent     int64         `json:"total_spent_paise"`
	TotalSettled   int64         `json:"total_settled_paise"`
	NetOwed        int64         `json:"net_owed_paise"` // TotalSpent - TotalSettled
}

// PartnerBalances is the full ledger for all partners in an org.
type PartnerBalances struct {
	Balances []PartnerBalance `json:"balances"`
}
