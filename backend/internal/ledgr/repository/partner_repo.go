package repository

import (
	"context"
	"database/sql"

	"hasufel.kj/internal/ledgr/domain"
)

// NewPartnerRepository returns a PartnerRepository backed by SQLite.
func NewPartnerRepository(db *sql.DB) PartnerRepository {
	return &partnerRepo{db: db}
}

type partnerRepo struct {
	db *sql.DB
}

func (r *partnerRepo) Balances(ctx context.Context, orgID string) (*domain.PartnerBalances, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT funding_source,
		       SUM(CASE WHEN entry_type != 'settlement' THEN amount_paise ELSE 0 END) AS spent,
		       SUM(CASE WHEN entry_type  = 'settlement' THEN amount_paise ELSE 0 END) AS settled
		FROM ledgr_expenses
		WHERE org_id = ?
		  AND funding_source IN ('personal','partner2','partner3')
		GROUP BY funding_source
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var balances []domain.PartnerBalance
	for rows.Next() {
		var b domain.PartnerBalance
		var fs string
		if err := rows.Scan(&fs, &b.TotalSpent, &b.TotalSettled); err != nil {
			return nil, err
		}
		b.FundingSource = domain.FundingSource(fs)
		b.NetOwed = b.TotalSpent - b.TotalSettled
		balances = append(balances, b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &domain.PartnerBalances{Balances: balances}, nil
}
