package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// ExpenseHandler handles CRUD and calendar summary for expenses.
type ExpenseHandler struct {
	svc *service.ExpenseService
	log *logger.Logger
}

// NewExpenseHandler creates an ExpenseHandler.
func NewExpenseHandler(svc *service.ExpenseService, log *logger.Logger) *ExpenseHandler {
	return &ExpenseHandler{svc: svc, log: log}
}

// Create handles POST /api/v1/ledgr/expenses
func (h *ExpenseHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	userID := userIDFromContext(r.Context())

	var e domain.Expense
	if err := decodeJSON(r, &e); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.OrgID = orgID
	e.CreatedBy = userID

	if err := h.svc.Create(r.Context(), &e); err != nil {
		h.log.Error("create expense", "error", err)
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, e)
}

// List handles GET /api/v1/ledgr/expenses
func (h *ExpenseHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	q := r.URL.Query()

	f := domain.ExpenseFilters{
		DateFrom:      q.Get("date_from"),
		DateTo:        q.Get("date_to"),
		CategoryID:    q.Get("category_id"),
		FundingSource: domain.FundingSource(q.Get("funding_source")),
		PaymentMethod: domain.PaymentMethod(q.Get("payment_method")),
		StoreID:       q.Get("store_id"),
		EntryType:     domain.EntryType(q.Get("entry_type")),
	}
	if p, err := strconv.Atoi(q.Get("page")); err == nil {
		f.Page = p
	}
	if p, err := strconv.Atoi(q.Get("per_page")); err == nil {
		f.PerPage = p
	}

	expenses, total, err := h.svc.List(r.Context(), orgID, f)
	if err != nil {
		h.log.Error("list expenses", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to list expenses")
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{
		"data":  expenses,
		"total": total,
		"page":  f.Page,
	})
}

// Get handles GET /api/v1/ledgr/expenses/:id
func (h *ExpenseHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	e, err := h.svc.Get(r.Context(), orgID, id)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, e)
}

// Update handles PUT /api/v1/ledgr/expenses/:id
func (h *ExpenseHandler) Update(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	var e domain.Expense
	if err := decodeJSON(r, &e); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.ID = id
	e.OrgID = orgID

	if err := h.svc.Update(r.Context(), &e); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, e)
}

// Delete handles DELETE /api/v1/ledgr/expenses/:id
func (h *ExpenseHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.svc.Delete(r.Context(), orgID, id); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// CalendarSummary handles GET /api/v1/ledgr/expenses/calendar/:year/:month
func (h *ExpenseHandler) CalendarSummary(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	year, errY := strconv.Atoi(chi.URLParam(r, "year"))
	month, errM := strconv.Atoi(chi.URLParam(r, "month"))
	if errY != nil || errM != nil || month < 1 || month > 12 {
		respondError(w, http.StatusBadRequest, "invalid year or month")
		return
	}

	summary, err := h.svc.CalendarSummary(r.Context(), orgID, year, month)
	if err != nil {
		h.log.Error("calendar summary", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to compute calendar summary")
		return
	}
	respondJSON(w, http.StatusOK, summary)
}
