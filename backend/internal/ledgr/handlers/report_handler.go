package handlers

import (
	"net/http"
	"time"

	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// ReportHandler serves P&L, GST, and partner reports.
type ReportHandler struct {
	svc *service.ReportService
	log *logger.Logger
}

// NewReportHandler creates a ReportHandler.
func NewReportHandler(svc *service.ReportService, log *logger.Logger) *ReportHandler {
	return &ReportHandler{svc: svc, log: log}
}

// PL handles GET /api/v1/ledgr/reports/pl?from=YYYY-MM-DD&to=YYYY-MM-DD
func (h *ReportHandler) PL(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	dateFrom, dateTo := parseDateRange(r)

	report, err := h.svc.PL(r.Context(), orgID, dateFrom, dateTo)
	if err != nil {
		h.log.Error("pl report", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to generate P&L report")
		return
	}
	respondJSON(w, http.StatusOK, report)
}

// GST handles GET /api/v1/ledgr/reports/gst?from=YYYY-MM-DD&to=YYYY-MM-DD
func (h *ReportHandler) GST(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	dateFrom, dateTo := parseDateRange(r)

	report, err := h.svc.GST(r.Context(), orgID, dateFrom, dateTo)
	if err != nil {
		h.log.Error("gst report", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to generate GST report")
		return
	}
	respondJSON(w, http.StatusOK, report)
}

// Partners handles GET /api/v1/ledgr/reports/partners?from=YYYY-MM-DD&to=YYYY-MM-DD
func (h *ReportHandler) Partners(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	dateFrom, dateTo := parseDateRange(r)

	report, err := h.svc.Partners(r.Context(), orgID, dateFrom, dateTo)
	if err != nil {
		h.log.Error("partners report", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to generate partners report")
		return
	}
	respondJSON(w, http.StatusOK, report)
}

// parseDateRange reads ?from= and ?to= query params, defaulting to the current month.
func parseDateRange(r *http.Request) (string, string) {
	now := time.Now()
	defaultFrom := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	defaultTo := now.Format("2006-01-02")

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" {
		from = defaultFrom
	}
	if to == "" {
		to = defaultTo
	}
	return from, to
}
