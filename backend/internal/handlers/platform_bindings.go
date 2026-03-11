package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type PlatformBindingHandler struct {
	repo repository.PlatformBindingRepository
	log  *logger.Logger
}

func NewPlatformBindingHandler(repo repository.PlatformBindingRepository, log *logger.Logger) *PlatformBindingHandler {
	return &PlatformBindingHandler{repo: repo, log: log}
}

// GET /api/v1/platform-bindings
func (h *PlatformBindingHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	var storeUUID *uuid.UUID
	if storeIDStr := r.URL.Query().Get("store_id"); storeIDStr != "" {
		parsed, err := uuid.Parse(storeIDStr)
		if err != nil {
			utils.RespondError(w, http.StatusBadRequest, "INVALID_STORE_ID", "Invalid store ID", nil)
			return
		}
		storeUUID = &parsed
	}

	bindings, err := h.repo.List(r.Context(), orgUUID, storeUUID)
	if err != nil {
		h.log.Error("Failed to list bindings", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, bindings)
}

// POST /api/v1/platform-bindings
func (h *PlatformBindingHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	var req domain.CreatePlatformBindingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.StoreID == uuid.Nil || req.Platform == "" || req.RestaurantID == "" {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeId, platform, and restaurantId are required", nil)
		return
	}
	if req.Platform != "swiggy" && req.Platform != "zomato" {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_PLATFORM", "platform must be swiggy or zomato", nil)
		return
	}

	b := &domain.PlatformBinding{
		OrganizationID: orgUUID,
		StoreID:        req.StoreID,
		Platform:       req.Platform,
		RestaurantID:   req.RestaurantID,
		RestaurantName: req.RestaurantName,
	}

	id, err := h.repo.Create(r.Context(), b)
	if err != nil {
		h.log.Error("Failed to create binding", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}
	b.ID = id

	utils.RespondSuccess(w, http.StatusCreated, b)
}

// PUT /api/v1/platform-bindings/{id}
func (h *PlatformBindingHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	bindingID := chi.URLParam(r, "id")
	bindingUUID, err := uuid.Parse(bindingID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_BINDING_ID", "Invalid binding ID", nil)
		return
	}

	b, err := h.repo.GetByID(r.Context(), bindingUUID)
	if err != nil || b == nil {
		utils.RespondError(w, http.StatusNotFound, "BINDING_NOT_FOUND", "Binding not found", nil)
		return
	}

	var req domain.UpdatePlatformBindingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if req.RestaurantName != nil {
		b.RestaurantName = req.RestaurantName
	}
	if req.IsActive != nil {
		b.IsActive = *req.IsActive
	}

	if err := h.repo.Update(r.Context(), b); err != nil {
		h.log.Error("Failed to update binding", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, b)
}

// DELETE /api/v1/platform-bindings/{id}
func (h *PlatformBindingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if !requireAdmin(w, r) {
		return
	}

	bindingID := chi.URLParam(r, "id")
	bindingUUID, err := uuid.Parse(bindingID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_BINDING_ID", "Invalid binding ID", nil)
		return
	}

	if err := h.repo.Delete(r.Context(), bindingUUID); err != nil {
		h.log.Error("Failed to delete binding", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, map[string]string{"message": "Binding deleted"})
}
