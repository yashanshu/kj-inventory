package handlers

import (
	"net/http"

	"hasufel.kj/internal/ledgr/domain"
	"hasufel.kj/internal/ledgr/repository"
	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// PartnerHandler handles partner balance queries and settlement entry creation.
type PartnerHandler struct {
	partners repository.PartnerRepository
	expenses *service.ExpenseService
	log      *logger.Logger
}

// NewPartnerHandler creates a PartnerHandler.
func NewPartnerHandler(partners repository.PartnerRepository, expenses *service.ExpenseService, log *logger.Logger) *PartnerHandler {
	return &PartnerHandler{partners: partners, expenses: expenses, log: log}
}

// Balances handles GET /api/v1/ledgr/partners/balances
func (h *PartnerHandler) Balances(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	balances, err := h.partners.Balances(r.Context(), orgID)
	if err != nil {
		h.log.Error("partner balances", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to compute partner balances")
		return
	}
	respondJSON(w, http.StatusOK, balances)
}

// CreateSettlement handles POST /api/v1/ledgr/settlements
// A settlement entry records a reimbursement from payout to a partner.
func (h *PartnerHandler) CreateSettlement(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	userID := userIDFromContext(r.Context())

	var e domain.Expense
	if err := decodeJSON(r, &e); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	e.OrgID = orgID
	e.CreatedBy = userID
	e.EntryType = domain.EntrySettlement

	if err := h.expenses.Create(r.Context(), &e); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, e)
}
