package handlers

import (
	"net/http"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// ExportHandler serves CSV and PDF exports.
type ExportHandler struct {
	svc *service.ExportService
	log *logger.Logger
}

// NewExportHandler creates an ExportHandler.
func NewExportHandler(svc *service.ExportService, log *logger.Logger) *ExportHandler {
	return &ExportHandler{svc: svc, log: log}
}

// CSV handles GET /api/v1/ledgr/exports/csv
func (h *ExportHandler) CSV(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	f := filtersFromQuery(r)

	data, err := h.svc.CSV(r.Context(), orgID, f)
	if err != nil {
		h.log.Error("csv export", "error", err)
		respondError(w, http.StatusInternalServerError, "export failed")
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", `attachment; filename="ledgr-export.csv"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// PDF handles GET /api/v1/ledgr/exports/pdf
func (h *ExportHandler) PDF(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	f := filtersFromQuery(r)

	data, err := h.svc.PDF(r.Context(), orgID, f)
	if err != nil {
		h.log.Error("pdf export", "error", err)
		respondError(w, http.StatusInternalServerError, "export failed")
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="ledgr-export.txt"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// filtersFromQuery builds ExpenseFilters from the URL query string.
func filtersFromQuery(r *http.Request) domain.ExpenseFilters {
	q := r.URL.Query()
	return domain.ExpenseFilters{
		DateFrom:      q.Get("date_from"),
		DateTo:        q.Get("date_to"),
		CategoryID:    q.Get("category_id"),
		FundingSource: domain.FundingSource(q.Get("funding_source")),
		PaymentMethod: domain.PaymentMethod(q.Get("payment_method")),
		StoreID:       q.Get("store_id"),
		EntryType:     domain.EntryType(q.Get("entry_type")),
	}
}
