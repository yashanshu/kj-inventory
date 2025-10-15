package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
	"hasufel.kj/pkg/utils"
)

type AuthHandler struct {
	authService *services.AuthService
	log         *logger.Logger
}

func NewAuthHandler(authService *services.AuthService, log *logger.Logger) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		log:         log,
	}
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  *domain.User `json:"user"`
}

type RegisterRequest struct {
	Email          string `json:"email" validate:"required,email"`
	Password       string `json:"password" validate:"required,min=8"`
	FirstName      string `json:"first_name" validate:"required"`
	LastName       string `json:"last_name" validate:"required"`
	OrganizationID string `json:"organization_id" validate:"required,uuid"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	token, user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == services.ErrInvalidCredentials {
			utils.RespondError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password", nil)
			return
		}
		if err == services.ErrUserInactive {
			utils.RespondError(w, http.StatusForbidden, "USER_INACTIVE", "User account is inactive", nil)
			return
		}
		h.log.Error("Failed to login", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, LoginResponse{
		Token: token,
		User:  user,
	})
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_ORG_ID", "Invalid organization ID", nil)
		return
	}

	user := &domain.User{
		Email:          req.Email,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		OrganizationID: orgID,
	}

	token, err := h.authService.Register(r.Context(), user, req.Password)
	if err != nil {
		if err == services.ErrEmailExists {
			utils.RespondError(w, http.StatusConflict, "EMAIL_EXISTS", "Email already exists", nil)
			return
		}
		h.log.Error("Failed to register", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusCreated, LoginResponse{
		Token: token,
		User:  user,
	})
}

// GetProfile retrieves the current user's profile
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	id, err := uuid.Parse(userID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID", nil)
		return
	}

	user, err := h.authService.GetUserByID(r.Context(), id)
	if err != nil {
		if err == services.ErrUserNotFound {
			utils.RespondError(w, http.StatusNotFound, "USER_NOT_FOUND", "User not found", nil)
			return
		}
		h.log.Error("Failed to get user profile", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, user)
}

// ChangePassword handles password change
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	id, err := uuid.Parse(userID)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID", nil)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", nil)
		return
	}

	if err := h.authService.ChangePassword(r.Context(), id, req.OldPassword, req.NewPassword); err != nil {
		if err == services.ErrInvalidCredentials {
			utils.RespondError(w, http.StatusUnauthorized, "INVALID_PASSWORD", "Invalid old password", nil)
			return
		}
		h.log.Error("Failed to change password", err)
		utils.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", nil)
		return
	}

	utils.RespondSuccess(w, http.StatusOK, map[string]string{"message": "Password changed successfully"})
}
