package service

import (
	"context"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
)

// ReportService computes P&L, GST summaries, and partner reports.
type ReportService struct {
	expenses repository.ExpenseRepository
}

// NewReportService creates a ReportService.
func NewReportService(expenses repository.ExpenseRepository) *ReportService {
	return &ReportService{expenses: expenses}
}

// PL returns a P&L summary for the given date range.
func (s *ReportService) PL(ctx context.Context, orgID, dateFrom, dateTo string) (*domain.PLReport, error) {
	byCategory, err := s.expenses.SumByCategory(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	byFunding, err := s.expenses.SumByFunding(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	gstRows, err := s.expenses.GSTRows(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}

	var totalPaise, totalGSTPaise int64
	for _, ct := range byCategory {
		totalPaise += ct.TotalPaise
	}
	for _, gr := range gstRows {
		totalGSTPaise += gr.TotalGSTPaise
	}

	return &domain.PLReport{
		DateFrom:        dateFrom,
		DateTo:          dateTo,
		TotalPaise:      totalPaise,
		TotalGSTPaise:   totalGSTPaise,
		NetPaise:        totalPaise - totalGSTPaise,
		ByCategory:      byCategory,
		ByFundingSource: byFunding,
	}, nil
}

// GST returns the GST summary for GSTR-3B filing.
func (s *ReportService) GST(ctx context.Context, orgID, dateFrom, dateTo string) (*domain.GSTSummary, error) {
	rows, err := s.expenses.GSTRows(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}

	var totals domain.GSTTotals
	for _, r := range rows {
		totals.TaxablePaise += r.TaxablePaise
		totals.CGSTPaise += r.CGSTPaise
		totals.SGSTPaise += r.SGSTPaise
		totals.IGSTPaise += r.IGSTPaise
		totals.TotalGSTPaise += r.TotalGSTPaise
	}

	return &domain.GSTSummary{
		DateFrom: dateFrom,
		DateTo:   dateTo,
		Rows:     rows,
		Totals:   totals,
	}, nil
}

// Partners returns per-partner expense and settlement totals.
func (s *ReportService) Partners(ctx context.Context, orgID, dateFrom, dateTo string) (*domain.PartnerReport, error) {
	entries, err := s.expenses.SettlementsByPartner(ctx, orgID, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	return &domain.PartnerReport{
		DateFrom: dateFrom,
		DateTo:   dateTo,
		Partners: entries,
	}, nil
}
