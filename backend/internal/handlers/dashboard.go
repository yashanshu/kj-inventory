package handlers

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type DashboardHandler struct {
	dashboardService *services.DashboardService
	log              *logger.Logger
}

func NewDashboardHandler(dashboardService *services.DashboardService, log *logger.Logger) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
		log:              log,
	}
}

func (h *DashboardHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	metrics, err := h.dashboardService.GetMetrics(r.Context(), orgUUID)
	if err != nil {
		h.log.Error("Failed to get metrics", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, metrics)
}

func (h *DashboardHandler) GetRecentMovements(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}

	movements, err := h.dashboardService.GetRecentMovements(r.Context(), orgUUID, limit)
	if err != nil {
		h.log.Error("Failed to get recent movements", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, movements)
}

func (h *DashboardHandler) GetStockTrends(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 {
		days = 7
	}

	trends, err := h.dashboardService.GetStockTrends(r.Context(), orgUUID, days)
	if err != nil {
		h.log.Error("Failed to get stock trends", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, trends)
}

func (h *DashboardHandler) GetCategoryBreakdown(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	breakdown, err := h.dashboardService.GetCategoryBreakdown(r.Context(), orgUUID)
	if err != nil {
		h.log.Error("Failed to get category breakdown", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, breakdown)
}

func (h *DashboardHandler) GetLowStockItems(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}

	items, err := h.dashboardService.GetLowStockItems(r.Context(), orgUUID, limit)
	if err != nil {
		h.log.Error("Failed to get low stock items", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, items)
}

func (h *DashboardHandler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	orgID := r.Context().Value("organization_id").(string)
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}

	alerts, err := h.dashboardService.GetAlerts(r.Context(), orgUUID, limit)
	if err != nil {
		h.log.Error("Failed to get alerts", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, alerts)
}
