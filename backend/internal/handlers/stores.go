package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type StoreHandler struct {
	repo repository.StoreRepository
	log  *logger.Logger
}

func NewStoreHandler(repo repository.StoreRepository, log *logger.Logger) *StoreHandler {
	return &StoreHandler{repo: repo, log: log}
}

// GET /api/v1/stores
func (h *StoreHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	stores, err := h.repo.List(r.Context(), orgUUID)
	if err != nil {
		h.log.Error("Failed to list stores", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, stores)
}

// POST /api/v1/stores
func (h *StoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	var req domain.CreateStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Code = strings.TrimSpace(req.Code)
	if req.Name == "" || req.Code == "" {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "name and code are required", nil)
		return
	}

	store := &domain.Store{
		OrganizationID: orgUUID,
		Name:           req.Name,
		Code:           req.Code,
		IsPrimary:      req.IsPrimary,
		Metadata:       "{}",
	}

	id, err := h.repo.Create(r.Context(), store)
	if err != nil {
		h.log.Error("Failed to create store", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}
	store.ID = id

	if req.IsPrimary {
		if err := h.repo.SetPrimary(r.Context(), orgUUID, id); err != nil {
			h.log.Error("Failed to set primary store", err)
		}
		store.IsPrimary = true
	}

	utils.RespondSuccess(w, http.StatusCreated, store)
}

// PUT /api/v1/stores/{id}
func (h *StoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	storeID := chi.URLParam(r, "id")
	storeUUID, err := uuid.Parse(storeID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_STORE_ID", "Invalid store ID", nil)
		return
	}

	store, err := h.repo.GetByID(r.Context(), storeUUID)
	if err != nil || store == nil {
		utils.RespondError(w, http.StatusNotFound, "STORE_NOT_FOUND", "Store not found", nil)
		return
	}
	if store.OrganizationID != orgUUID {
		utils.RespondError(w, http.StatusForbidden, "FORBIDDEN", "Store does not belong to this organization", nil)
		return
	}

	var req domain.UpdateStoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.Name != nil {
		store.Name = strings.TrimSpace(*req.Name)
	}
	if req.Code != nil {
		store.Code = strings.TrimSpace(*req.Code)
	}
	if req.IsPrimary != nil {
		store.IsPrimary = *req.IsPrimary
	}

	if err := h.repo.Update(r.Context(), store); err != nil {
		h.log.Error("Failed to update store", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	if req.IsPrimary != nil && *req.IsPrimary {
		if err := h.repo.SetPrimary(r.Context(), orgUUID, storeUUID); err != nil {
			h.log.Error("Failed to set primary store", err)
		}
	}

	utils.RespondSuccess(w, http.StatusOK, store)
}

// DELETE /api/v1/stores/{id}
func (h *StoreHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	storeID := chi.URLParam(r, "id")
	storeUUID, err := uuid.Parse(storeID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_STORE_ID", "Invalid store ID", nil)
		return
	}

	store, err := h.repo.GetByID(r.Context(), storeUUID)
	if err != nil || store == nil {
		utils.RespondError(w, http.StatusNotFound, "STORE_NOT_FOUND", "Store not found", nil)
		return
	}
	if store.OrganizationID != orgUUID {
		utils.RespondError(w, http.StatusForbidden, "FORBIDDEN", "Store does not belong to this organization", nil)
		return
	}

	if err := h.repo.Deactivate(r.Context(), storeUUID); err != nil {
		h.log.Error("Failed to deactivate store", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, map[string]string{"message": "Store deactivated"})
}
