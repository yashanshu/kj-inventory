package handlers

import (
	"net/http"

	"hasufel.kj/internal/ledgr/repository"
	"hasufel.kj/pkg/logger"
)

// StoreHandler serves the Ledgr-owned stores read endpoint.
type StoreHandler struct {
	repo repository.StoreRepository
	log  *logger.Logger
}

// NewStoreHandler creates a StoreHandler.
func NewStoreHandler(repo repository.StoreRepository, log *logger.Logger) *StoreHandler {
	return &StoreHandler{repo: repo, log: log}
}

// List handles GET /api/v1/ledgr/stores
func (h *StoreHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	stores, err := h.repo.ListByOrg(r.Context(), orgID)
	if err != nil {
		h.log.Error("list stores", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to list stores")
		return
	}
	respondJSON(w, http.StatusOK, stores)
}
