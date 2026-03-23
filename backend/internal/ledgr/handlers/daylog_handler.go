package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"hasufel.kj/internal/ledgr/service"
	"hasufel.kj/pkg/logger"
)

// DaylogHandler manages the day-level state machine via HTTP.
type DaylogHandler struct {
	svc *service.LockService
	log *logger.Logger
}

// NewDaylogHandler creates a DaylogHandler.
func NewDaylogHandler(svc *service.LockService, log *logger.Logger) *DaylogHandler {
	return &DaylogHandler{svc: svc, log: log}
}

// Get handles GET /api/v1/ledgr/daylog/:date
func (h *DaylogHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	date := chi.URLParam(r, "date")

	dl, err := h.svc.GetOrCreate(r.Context(), orgID, date)
	if err != nil {
		h.log.Error("get daylog", "error", err)
		respondError(w, http.StatusInternalServerError, "failed to get day log")
		return
	}
	respondJSON(w, http.StatusOK, dl)
}

// Submit handles POST /api/v1/ledgr/daylog/:date/submit (mark entries done)
func (h *DaylogHandler) Submit(w http.ResponseWriter, r *http.Request) {
	orgID := orgIDFromContext(r.Context())
	userID := userIDFromContext(r.Context())
	date := chi.URLParam(r, "date")

	dl, err := h.svc.Submit(r.Context(), orgID, date, userID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, dl)
}

// Lock handles POST /api/v1/ledgr/daylog/:date/lock (admin only)
func (h *DaylogHandler) Lock(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	userID := userIDFromContext(r.Context())
	date := chi.URLParam(r, "date")

	dl, err := h.svc.Lock(r.Context(), orgID, date, userID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, dl)
}

// Unlock handles POST /api/v1/ledgr/daylog/:date/unlock (admin only)
func (h *DaylogHandler) Unlock(w http.ResponseWriter, r *http.Request) {
	if !isAdmin(r) {
		respondError(w, http.StatusForbidden, "admin access required")
		return
	}
	orgID := orgIDFromContext(r.Context())
	userID := userIDFromContext(r.Context())
	date := chi.URLParam(r, "date")

	dl, err := h.svc.Unlock(r.Context(), orgID, date, userID)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, dl)
}
