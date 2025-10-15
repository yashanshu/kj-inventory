package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type InventoryHandler struct {
	inventoryService *services.InventoryService
	log              *logger.Logger
}

func NewInventoryHandler(inventoryService *services.InventoryService, log *logger.Logger) *InventoryHandler {
	return &InventoryHandler{
		inventoryService: inventoryService,
		log:              log,
	}
}

// Item handlers

func (h *InventoryHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	var req domain.CreateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	item := &domain.Item{
		OrganizationID:    orgUUID,
		CategoryID:        req.CategoryID,
		Name:              req.Name,
		SKU:               req.SKU,
		UnitOfMeasurement: req.UnitOfMeasurement,
		MinimumThreshold:  req.MinimumThreshold,
		CurrentStock:      req.CurrentStock,
		UnitCost:          req.UnitCost,
	}

	itemID, err := h.inventoryService.CreateItem(r.Context(), item)
	if err != nil {
		if err == services.ErrCategoryNotFound {
			utils.RespondError(w, http.StatusNotFound, "CATEGORY_NOT_FOUND", "Category not found", nil)
			return
		}
		h.log.Error("Failed to create item", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	item.ID = itemID
	utils.RespondSuccess(w, http.StatusCreated, item)
}

func (h *InventoryHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	id, err := uuid.Parse(itemID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "Invalid item ID", nil)
		return
	}

	item, err := h.inventoryService.GetItem(r.Context(), id)
	if err != nil {
		if err == services.ErrItemNotFound {
			utils.RespondError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "Item not found", nil)
			return
		}
		h.log.Error("Failed to get item", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, item)
}

func (h *InventoryHandler) GetItems(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 50
	}

	items, err := h.inventoryService.ListItems(r.Context(), orgUUID, limit, offset)
	if err != nil {
		h.log.Error("Failed to list items", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, items)
}

func (h *InventoryHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	id, err := uuid.Parse(itemID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "Invalid item ID", nil)
		return
	}

	var req domain.UpdateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	// Get existing item
	item, err := h.inventoryService.GetItem(r.Context(), id)
	if err != nil {
		if err == services.ErrItemNotFound {
			utils.RespondError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "Item not found", nil)
			return
		}
		h.log.Error("Failed to get item", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	// Update fields if provided
	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.SKU != nil {
		item.SKU = req.SKU
	}
	if req.UnitOfMeasurement != nil {
		item.UnitOfMeasurement = *req.UnitOfMeasurement
	}
	if req.MinimumThreshold != nil {
		item.MinimumThreshold = *req.MinimumThreshold
	}
	if req.UnitCost != nil {
		item.UnitCost = req.UnitCost
	}

	if err := h.inventoryService.UpdateItem(r.Context(), item); err != nil {
		h.log.Error("Failed to update item", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, item)
}

func (h *InventoryHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	id, err := uuid.Parse(itemID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ITEM_ID", "Invalid item ID", nil)
		return
	}

	if err := h.inventoryService.DeleteItem(r.Context(), id); err != nil {
		if err == services.ErrItemNotFound {
			utils.RespondError(w, http.StatusNotFound, "ITEM_NOT_FOUND", "Item not found", nil)
			return
		}
		h.log.Error("Failed to delete item", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, map[string]string{"message": "Item deleted successfully"})
}

// Category handlers

func (h *InventoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	var category domain.Category
	if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	category.OrganizationID = orgUUID
	categoryID, err := h.inventoryService.CreateCategory(r.Context(), &category)
	if err != nil {
		h.log.Error("Failed to create category", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	category.ID = categoryID
	utils.RespondSuccess(w, http.StatusCreated, category)
}

func (h *InventoryHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	categories, err := h.inventoryService.ListCategories(r.Context(), orgUUID)
	if err != nil {
		h.log.Error("Failed to list categories", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, categories)
}
