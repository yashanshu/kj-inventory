# KJ Inventory Management API Documentation

## Overview

Complete API documentation for the KJ Inventory Management System. The API is built with Go using the Chi router and follows RESTful principles.

**Base URL:** `http://localhost:8800`
**API Version:** v1
**API Base Path:** `/api/v1`

## Table of Contents

- [Authentication](#authentication)
- [Role-Based Access](#role-based-access)
- [Response Format](#response-format)
- [Error Codes](#error-codes)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Authentication](#authentication-endpoints)
  - [Categories](#categories)
  - [Items](#items)
  - [Stock Movements](#stock-movements)
  - [Dashboard](#dashboard)

## Authentication

Most endpoints require JWT authentication. After logging in or registering, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access

The API enforces role-based authorization using JWT claims. There are two roles:

| Role  | Capabilities |
|-------|--------------|
| `ADMIN` | Full access: manage items, categories, and stock movements; view cost data |
| `USER`  | Read-only access: view inventory, stock levels, and movements only |

**Default accounts:**
- Admin: `admin@example.com` / `admin123`
- Staff: `staff@example.com` / `admin123`

Endpoints marked "admin only" require an ADMIN role. Unit cost fields are only visible to admins.

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": null
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request body is malformed or invalid |
| `INVALID_CREDENTIALS` | Login credentials are incorrect |
| `USER_INACTIVE` | User account is inactive |
| `EMAIL_EXISTS` | Email already registered |
| `USER_NOT_FOUND` | User not found |
| `INVALID_PASSWORD` | Old password is incorrect |
| `CATEGORY_NOT_FOUND` | Category does not exist |
| `ITEM_NOT_FOUND` | Item does not exist |
| `INSUFFICIENT_STOCK` | Not enough stock for operation |
| `INVALID_QUANTITY` | Invalid quantity value |
| `INVALID_ORG_ID` | Organization ID is invalid |
| `INVALID_USER_ID` | User ID is invalid |
| `INVALID_ITEM_ID` | Item ID is invalid |
| `INTERNAL_ERROR` | Internal server error |

---

## Endpoints

## Health Check

### Check API Health

**GET** `/health`

Check if the API is running and healthy.

**Authentication:** Not required

**Response:**

```json
{
  "status": "ok"
}
```


**Status Codes:**
- `200 OK` - API is healthy

---

## Authentication Endpoints

### Register User

**POST** `/api/v1/auth/register`

Register a new user account.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": "00000000-0000-0000-0000-000000000001"
}
```

**Validation:**
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters
- `first_name`: Required
- `last_name`: Required
- `organization_id`: Required, valid UUID

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "organization_id": "00000000-0000-0000-0000-000000000001",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```


**Status Codes:**
- `201 Created` - User registered successfully
- `400 Bad Request` - Invalid request body or validation failed
- `409 Conflict` - Email already exists

---

### Login

**POST** `/api/v1/auth/login`

Authenticate user and receive JWT token.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "organization_id": "00000000-0000-0000-0000-000000000001",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  }
}
```


**Status Codes:**
- `200 OK` - Login successful
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - User account inactive

---

### Get User Profile

**GET** `/api/v1/auth/profile`

Get the current authenticated user's profile.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```


**Status Codes:**
- `200 OK` - Profile retrieved successfully
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - User not found

---

### Change Password

**POST** `/api/v1/auth/change-password`

Change the current user's password.

**Authentication:** Required

**Request Body:**

```json
{
  "old_password": "password123",
  "new_password": "newpassword456"
}
```

**Validation:**
- `old_password`: Required
- `new_password`: Required, minimum 8 characters

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Status Codes:**
- `200 OK` - Password changed successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Old password is incorrect

---

## Categories

### List Categories

**GET** `/api/v1/categories`

Get all categories for the organization.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "organization_id": "00000000-0000-0000-0000-000000000001",
      "name": "Electronics",
      "description": "Electronic components and devices",
      "color": "#3B82F6",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Categories retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Create Category

**POST** `/api/v1/categories`

Create a new category.

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "name": "Electronics",
  "description": "Electronic components and devices",
  "color": "#3B82F6"
}
```

**Validation:**
- `name`: Required, 1-100 characters
- `description`: Optional
- `color`: Optional, hex color code

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "name": "Electronics",
    "description": "Electronic components and devices",
    "color": "#3B82F6",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Category created successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Requires admin role

---

## Items

### List Items

**GET** `/api/v1/items?limit=50&offset=0`

Get all items for the organization with pagination.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "organization_id": "00000000-0000-0000-0000-000000000001",
      "category_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Arduino Uno R3",
      "sku": "ARD-UNO-R3",
      "unit_of_measurement": "pieces",
      "minimum_threshold": 10,
      "current_stock": 50,
      "unit_cost": 25.99,
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "category": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Electronics"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Items retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Create Item

**POST** `/api/v1/items`

Create a new inventory item.

**Authentication:** Required (admin only)

**Request Body:**

```json
{
  "category_id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Arduino Uno R3",
  "sku": "ARD-UNO-R3",
  "unit_of_measurement": "pieces",
  "minimum_threshold": 10,
  "current_stock": 50,
  "unit_cost": 25.99
}
```

**Validation:**
- `category_id`: Required, valid UUID
- `name`: Required, 1-255 characters
- `sku`: Optional
- `unit_of_measurement`: Required
- `minimum_threshold`: Required, >= 0
- `current_stock`: Required, >= 0
- `unit_cost`: Optional

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Arduino Uno R3",
    "sku": "ARD-UNO-R3",
    "unit_of_measurement": "pieces",
    "minimum_threshold": 10,
    "current_stock": 50,
    "unit_cost": 25.99,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Item created successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Requires admin role
- `404 Not Found` - Category not found

---

### Get Item

**GET** `/api/v1/items/{id}`

Get a single item by ID.

**Authentication:** Required

**URL Parameters:**
- `id`: Item UUID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Arduino Uno R3",
    "sku": "ARD-UNO-R3",
    "unit_of_measurement": "pieces",
    "minimum_threshold": 10,
    "current_stock": 50,
    "unit_cost": 25.99,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "category": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Electronics",
      "description": "Electronic components"
    }
  }
}
```

**Status Codes:**
- `200 OK` - Item retrieved successfully
- `400 Bad Request` - Invalid item ID format
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Item not found

---

### Update Item

**PUT** `/api/v1/items/{id}`

Update an existing item. Only provided fields will be updated.

**Authentication:** Required (admin only)

**URL Parameters:**
- `id`: Item UUID

**Request Body:**

```json
{
  "name": "Arduino Uno R3 (Updated)",
  "minimum_threshold": 15,
  "unit_cost": 24.99
}
```

**Validation:**
- `name`: Optional, 1-255 characters if provided
- `sku`: Optional
- `unit_of_measurement`: Optional
- `minimum_threshold`: Optional, >= 0 if provided
- `unit_cost`: Optional

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "category_id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Arduino Uno R3 (Updated)",
    "sku": "ARD-UNO-R3",
    "unit_of_measurement": "pieces",
    "minimum_threshold": 15,
    "current_stock": 50,
    "unit_cost": 24.99,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Item updated successfully
- `400 Bad Request` - Invalid request body or item ID
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Requires admin role
- `404 Not Found` - Item not found

---

### Delete Item

**DELETE** `/api/v1/items/{id}`

Delete an item (soft delete - marks as inactive).

**Authentication:** Required (admin only)

**URL Parameters:**
- `id`: Item UUID

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Item deleted successfully"
  }
}
```

**Status Codes:**
- `200 OK` - Item deleted successfully
- `400 Bad Request` - Invalid item ID format
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Requires admin role
- `404 Not Found` - Item not found

---

## Stock Movements

### Create Movement

**POST** `/api/v1/movements`

Create a stock movement (IN, OUT, or ADJUSTMENT).

**Authentication:** Required

**Request Body:**

```json
{
  "item_id": "770e8400-e29b-41d4-a716-446655440000",
  "movement_type": "IN",
  "quantity": 20,
  "reference": "PO-2024-001",
  "notes": "Restocking from supplier"
}
```

**Movement Types:**
- `IN`: Stock received (increases stock)
- `OUT`: Stock sold/used (decreases stock)
- `ADJUSTMENT`: Manual adjustment (positive or negative)

**Validation:**
- `item_id`: Required, valid UUID
- `movement_type`: Required, one of: `IN`, `OUT`, `ADJUSTMENT`
- `quantity`: Required, non-zero integer
- `reference`: Optional, reference number
- `notes`: Optional, additional notes

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "item_id": "770e8400-e29b-41d4-a716-446655440000",
    "movement_type": "IN",
    "quantity": 20,
    "previous_stock": 50,
    "new_stock": 70,
    "reference": "PO-2024-001",
    "notes": "Restocking from supplier",
    "created_by": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T11:00:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Movement created successfully
- `400 Bad Request` - Invalid request body, invalid quantity, or insufficient stock
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Item not found

---

### List Movements

**GET** `/api/v1/movements?limit=50&offset=0`

Get all stock movements for the organization.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of movements to return (default: 50)
- `offset` (optional): Number of movements to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "item_id": "770e8400-e29b-41d4-a716-446655440000",
      "movement_type": "IN",
      "quantity": 20,
      "previous_stock": 50,
      "new_stock": 70,
      "reference": "PO-2024-001",
      "notes": "Restocking from supplier",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T11:00:00Z",
      "item": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Arduino Uno R3"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Movements retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Item Movements

**GET** `/api/v1/items/{id}/movements?limit=50&offset=0`

Get all movements for a specific item.

**Authentication:** Required

**URL Parameters:**
- `id`: Item UUID

**Query Parameters:**
- `limit` (optional): Number of movements to return (default: 50)
- `offset` (optional): Number of movements to skip (default: 0)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "item_id": "770e8400-e29b-41d4-a716-446655440000",
      "movement_type": "IN",
      "quantity": 20,
      "previous_stock": 50,
      "new_stock": 70,
      "reference": "PO-2024-001",
      "notes": "Restocking from supplier",
      "created_by": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Item movements retrieved successfully
- `400 Bad Request` - Invalid item ID format
- `401 Unauthorized` - Not authenticated

---

## Dashboard

### Get Dashboard Metrics

**GET** `/api/v1/dashboard/metrics`

Get overall inventory metrics.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "total_items": 150,
    "total_value": 45678.90,
    "low_stock_items": 12,
    "out_of_stock_items": 3,
    "total_movements_today": 25
  }
}
```

**Status Codes:**
- `200 OK` - Metrics retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Recent Movements

**GET** `/api/v1/dashboard/recent-movements?limit=10`

Get recent stock movements.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of movements to return (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "item_id": "770e8400-e29b-41d4-a716-446655440000",
      "movement_type": "IN",
      "quantity": 20,
      "created_at": "2024-01-15T11:00:00Z",
      "item": {
        "name": "Arduino Uno R3"
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Recent movements retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Stock Trends

**GET** `/api/v1/dashboard/stock-trends?days=7`

Get stock trends over a period.

**Authentication:** Required

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "total_in": 150,
      "total_out": 75,
      "net_change": 75
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Stock trends retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Category Breakdown

**GET** `/api/v1/dashboard/category-breakdown`

Get inventory breakdown by category.

**Authentication:** Required

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "category_id": "660e8400-e29b-41d4-a716-446655440000",
      "category_name": "Electronics",
      "item_count": 45,
      "total_value": 15678.90,
      "total_stock": 1250
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Category breakdown retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Low Stock Items

**GET** `/api/v1/dashboard/low-stock?limit=10`

Get items that are below their minimum threshold.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Arduino Uno R3",
      "sku": "ARD-UNO-R3",
      "current_stock": 8,
      "minimum_threshold": 10,
      "shortage": 2
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Low stock items retrieved successfully
- `401 Unauthorized` - Not authenticated

---

### Get Alerts

**GET** `/api/v1/dashboard/alerts?limit=10`

Get inventory alerts.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of alerts to return (default: 10)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "item_id": "770e8400-e29b-41d4-a716-446655440000",
      "alert_type": "LOW_STOCK",
      "severity": "WARNING",
      "message": "Stock level below minimum threshold",
      "is_resolved": false,
      "created_at": "2024-01-15T11:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Alerts retrieved successfully
- `401 Unauthorized` - Not authenticated

---

## Testing the API

### Using curl

Example curl command:

```bash
# Login
curl -X POST http://localhost:8800/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Get items (authenticated)
curl -X GET http://localhost:8800/api/v1/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Rate Limiting

Currently, there is no rate limiting implemented. Consider implementing rate limiting in production.

## Pagination

Endpoints that return lists support pagination using `limit` and `offset` query parameters:

- `limit`: Number of items to return (default varies by endpoint)
- `offset`: Number of items to skip (default: 0)

Example:

```
GET /api/v1/items?limit=20&offset=40
```

## CORS

CORS is configured to allow the following:
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Accept, Authorization, Content-Type, X-CSRF-Token
- Credentials: Allowed

Allowed origins are configured in the server configuration.

## Security Notes

1. Always use HTTPS in production
2. Store JWT tokens securely (httpOnly cookies recommended for web apps)
3. Implement rate limiting for production
4. Use strong passwords (minimum 8 characters enforced)
5. Regularly rotate JWT secrets
6. Implement refresh token mechanism for production use

## Support

For issues or questions, please refer to the project repository or contact the development team.
