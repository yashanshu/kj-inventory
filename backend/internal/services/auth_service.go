package services

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"hasufel.kj/internal/domain"
	"hasufel.kj/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrUserInactive       = errors.New("user is inactive")
	ErrEmailExists        = errors.New("email already exists")
)

type Claims struct {
	UserID         string `json:"user_id"`
	Email          string `json:"email"`
	OrganizationID string `json:"organization_id"`
	Role           string `json:"role"`
	jwt.RegisteredClaims
}

type AuthService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(ctx context.Context, email, password string) (string, *domain.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return "", nil, err
	}
	if user == nil {
		return "", nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return "", nil, ErrUserInactive
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, user *domain.User, password string) (string, error) {
	// Check if email already exists
	existing, err := s.userRepo.GetByEmail(ctx, user.Email)
	if err != nil {
		return "", err
	}
	if existing != nil {
		return "", ErrEmailExists
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	user.PasswordHash = string(hashedPassword)

	// Set defaults
	user.IsActive = true
	if user.Role == "" {
		user.Role = domain.RoleUser
	}

	// Create user
	userID, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return "", err
	}
	user.ID = userID

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return "", err
	}

	return token, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

// ChangePassword changes a user's password
func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrInvalidCredentials
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hashedPassword)

	// Update user
	return s.userRepo.Update(ctx, user)
}

// generateToken creates a JWT token for a user
func (s *AuthService) generateToken(user *domain.User) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)

	claims := &Claims{
		UserID:         user.ID.String(),
		Email:          user.Email,
		OrganizationID: user.OrganizationID.String(),
		Role:           string(user.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
