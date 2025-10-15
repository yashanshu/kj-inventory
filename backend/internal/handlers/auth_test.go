package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"

	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/handlers"
	"hasufel.kj/internal/repository"
	"hasufel.kj/internal/services"
	"hasufel.kj/pkg/logger"
)

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", "file::memory:?cache=shared")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	// Create minimal schema
	schema := `
	CREATE TABLE IF NOT EXISTS organizations (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		slug TEXT UNIQUE NOT NULL,
		settings TEXT DEFAULT '{}',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		organization_id TEXT NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		first_name TEXT NOT NULL,
		last_name TEXT NOT NULL,
		role TEXT DEFAULT 'USER',
		is_active BOOLEAN DEFAULT true,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (organization_id) REFERENCES organizations(id)
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}

	return db
}

func setupAuthHandler(t *testing.T, db *sql.DB) *handlers.AuthHandler {
	t.Helper()
	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, "test-secret-key")
	log := logger.New("info")
	return handlers.NewAuthHandler(authService, log)
}

func TestAuthHandler_Register(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create a test organization first
	orgID := uuid.New()
	_, err := db.Exec("INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)",
		orgID.String(), "Test Org", "test-org")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}

	handler := setupAuthHandler(t, db)

	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		expectedError  string
		checkResponse  func(t *testing.T, body map[string]interface{})
	}{
		{
			name: "successful registration",
			requestBody: handlers.RegisterRequest{
				Email:          "test@example.com",
				Password:       "password123",
				FirstName:      "John",
				LastName:       "Doe",
				OrganizationID: orgID.String(),
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, body map[string]interface{}) {
				data, ok := body["data"].(map[string]interface{})
				if !ok {
					t.Fatal("expected data field in response")
				}
				if data["token"] == nil || data["token"] == "" {
					t.Error("expected token in response")
				}
				user, ok := data["user"].(map[string]interface{})
				if !ok {
					t.Fatal("expected user object in response")
				}
				if user["email"] != "test@example.com" {
					t.Errorf("expected email test@example.com, got %v", user["email"])
				}
				if user["first_name"] != "John" {
					t.Errorf("expected first_name John, got %v", user["first_name"])
				}
				if user["last_name"] != "Doe" {
					t.Errorf("expected last_name Doe, got %v", user["last_name"])
				}
			},
		},
		{
			name: "duplicate email",
			requestBody: handlers.RegisterRequest{
				Email:          "duplicate@example.com",
				Password:       "password123",
				FirstName:      "Jane",
				LastName:       "Smith",
				OrganizationID: orgID.String(),
			},
			expectedStatus: http.StatusConflict,
			expectedError:  "EMAIL_EXISTS",
		},
		{
			name: "invalid organization ID",
			requestBody: handlers.RegisterRequest{
				Email:          "test2@example.com",
				Password:       "password123",
				FirstName:      "Bob",
				LastName:       "Jones",
				OrganizationID: "invalid-uuid",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_ORG_ID",
		},
		{
			name:           "invalid request body",
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_REQUEST",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For the duplicate email test, create a user first
			if tt.name == "duplicate email" {
				user := &domain.User{
					Email:          "duplicate@example.com",
					FirstName:      "Existing",
					LastName:       "User",
					OrganizationID: orgID,
					PasswordHash:   "$2a$10$hashedpassword",
					IsActive:       true,
					Role:           domain.RoleUser,
				}
				userRepo := repository.NewUserRepository(db)
				_, _ = userRepo.Create(context.Background(), user)
			}

			var body []byte
			var err error
			if str, ok := tt.requestBody.(string); ok {
				body = []byte(str)
			} else {
				body, err = json.Marshal(tt.requestBody)
				if err != nil {
					t.Fatalf("marshal request: %v", err)
				}
			}

			req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Register(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			var responseBody map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			// Check for expected error
			if tt.expectedError != "" {
				errorObj, ok := responseBody["error"].(map[string]interface{})
				if !ok {
					t.Fatal("expected error object in response")
				}
				if errorObj["code"] != tt.expectedError {
					t.Errorf("expected error code %s, got %v", tt.expectedError, errorObj["code"])
				}
			}

			// Check custom response validation
			if tt.checkResponse != nil {
				tt.checkResponse(t, responseBody)
			}
		})
	}
}

func TestAuthHandler_Login(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create a test organization
	orgID := uuid.New()
	_, err := db.Exec("INSERT INTO organizations (id, name, slug) VALUES (?, ?, ?)",
		orgID.String(), "Test Org", "test-org")
	if err != nil {
		t.Fatalf("create org: %v", err)
	}

	// Create a test user
	userRepo := repository.NewUserRepository(db)
	authService := services.NewAuthService(userRepo, "test-secret-key")

	user := &domain.User{
		Email:          "login@example.com",
		FirstName:      "Login",
		LastName:       "User",
		OrganizationID: orgID,
	}
	_, err = authService.Register(context.Background(), user, "password123")
	if err != nil {
		t.Fatalf("create test user: %v", err)
	}

	handler := setupAuthHandler(t, db)

	tests := []struct {
		name           string
		email          string
		password       string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "successful login",
			email:          "login@example.com",
			password:       "password123",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid email",
			email:          "wrong@example.com",
			password:       "password123",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "INVALID_CREDENTIALS",
		},
		{
			name:           "invalid password",
			email:          "login@example.com",
			password:       "wrongpassword",
			expectedStatus: http.StatusUnauthorized,
			expectedError:  "INVALID_CREDENTIALS",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody := handlers.LoginRequest{
				Email:    tt.email,
				Password: tt.password,
			}
			body, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatalf("marshal request: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			handler.Login(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			var responseBody map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&responseBody); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			if tt.expectedError != "" {
				errorObj, ok := responseBody["error"].(map[string]interface{})
				if !ok {
					t.Fatal("expected error object in response")
				}
				if errorObj["code"] != tt.expectedError {
					t.Errorf("expected error code %s, got %v", tt.expectedError, errorObj["code"])
				}
			} else {
				// Check successful login response
				data, ok := responseBody["data"].(map[string]interface{})
				if !ok {
					t.Fatal("expected data field in response")
				}
				if data["token"] == nil || data["token"] == "" {
					t.Error("expected token in response")
				}
			}
		})
	}
}
