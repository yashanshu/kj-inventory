package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	OrganizationID string `json:"organization_id"`
	Role           string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens and extracts user information
func AuthMiddleware(jwtSecret string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract token from Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				respondError(w, http.StatusUnauthorized, "Missing authorization header")
				return
			}

			// Check for Bearer token
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				respondError(w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}

			tokenString := parts[1]

			// Parse and validate token
			token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
				// Validate signing method
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})

			if err != nil {
				respondError(w, http.StatusUnauthorized, "Invalid token")
				return
			}

			if claims, ok := token.Claims.(*Claims); ok && token.Valid {
				// Add user information to context
				ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
				ctx = context.WithValue(ctx, "email", claims.Email)
				ctx = context.WithValue(ctx, "organization_id", claims.OrganizationID)
				ctx = context.WithValue(ctx, "role", claims.Role)

				next.ServeHTTP(w, r.WithContext(ctx))
			} else {
				respondError(w, http.StatusUnauthorized, "Invalid token claims")
				return
			}
		})
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
