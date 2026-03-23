# Implementation Plan: Store & Platform Foundation

> Phase 1 = Backend API only. Phase 2 = Frontend (Flutter + web).
> Schema is complete — no migrations needed for Phase 1 or Phase 2.

---

## Pre-work: One schema fix

`platform_store_bindings.id` has `TEXT PRIMARY KEY` with no UUID DEFAULT expression
(unlike every other table). Backend must supply UUID on insert.
No migration needed — handled in the repo implementation.

---

## Phase 1 — Backend API

Work order below is from least to most dependent.

---

### Step 1 · Store domain type

**File to create:** `backend/internal/domain/store.go`

```go
type Store struct {
    ID             uuid.UUID
    OrganizationID uuid.UUID
    Name           string
    Code           string
    IsPrimary      bool
    IsActive       bool   // stored in metadata_json or add column — see note
    Metadata       string // metadata_json raw
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

type CreateStoreRequest struct {
    Name      string `json:"name" validate:"required"`
    Code      string `json:"code" validate:"required"`
    IsPrimary bool   `json:"isPrimary"`
}

type UpdateStoreRequest struct {
    Name      *string `json:"name"`
    Code      *string `json:"code"`
    IsPrimary *bool   `json:"isPrimary"`
}
```

**Note on IsActive:** The `stores` table in migration 001 does not have an `is_active` column.
Options:
- (a) Store is_active in `metadata_json` — simplest, no migration
- (b) Add `is_active` column in a new migration — cleaner long-term

**Recommend option (b):** Add migration `000005_add_store_is_active.up.sql`:
```sql
ALTER TABLE stores ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(organization_id, is_active);
```

This is a non-breaking additive change.

---

### Step 2 · PlatformBinding domain type

**File to create:** `backend/internal/domain/platform_binding.go`

```go
type PlatformBinding struct {
    ID             uuid.UUID
    OrganizationID uuid.UUID
    StoreID        uuid.UUID
    Platform       string    // "swiggy" | "zomato"
    RestaurantID   string
    RestaurantName *string
    IsActive       bool
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

type CreatePlatformBindingRequest struct {
    StoreID        uuid.UUID `json:"storeId" validate:"required"`
    Platform       string    `json:"platform" validate:"required,oneof=swiggy zomato"`
    RestaurantID   string    `json:"restaurantId" validate:"required"`
    RestaurantName *string   `json:"restaurantName"`
}

type UpdatePlatformBindingRequest struct {
    RestaurantName *string `json:"restaurantName"`
    IsActive       *bool   `json:"isActive"`
}
```

---

### Step 3 · StoreRepository interface + SQLite implementation

**Add to:** `backend/internal/repository/interfaces.go`

```go
type StoreRepository interface {
    List(ctx context.Context, orgID uuid.UUID) ([]*domain.Store, error)
    GetByID(ctx context.Context, id uuid.UUID) (*domain.Store, error)
    Create(ctx context.Context, store *domain.Store) (uuid.UUID, error)
    Update(ctx context.Context, store *domain.Store) error
    SetPrimary(ctx context.Context, orgID, storeID uuid.UUID) error  // clears others, sets one
    Deactivate(ctx context.Context, id uuid.UUID) error
}
```

**File to create:** `backend/internal/repository/store_repo.go`

Key implementation notes:
- `SetPrimary` must run two UPDATEs in a single transaction:
  1. `UPDATE stores SET is_primary = false WHERE organization_id = ?`
  2. `UPDATE stores SET is_primary = true WHERE id = ?`
- `List` filters by `is_active = true` by default; add `includeInactive` param if needed

---

### Step 4 · PlatformBindingRepository interface + SQLite implementation

**Add to:** `backend/internal/repository/interfaces.go`

```go
type PlatformBindingRepository interface {
    List(ctx context.Context, orgID uuid.UUID, storeID *uuid.UUID) ([]*domain.PlatformBinding, error)
    GetByID(ctx context.Context, id uuid.UUID) (*domain.PlatformBinding, error)
    GetByPlatformAndRestaurantID(ctx context.Context, platform, restaurantID string) (*domain.PlatformBinding, error)
    Create(ctx context.Context, b *domain.PlatformBinding) (uuid.UUID, error)
    Update(ctx context.Context, b *domain.PlatformBinding) error
    Delete(ctx context.Context, id uuid.UUID) error
}
```

**File to create:** `backend/internal/repository/platform_binding_repo.go`

Key implementation notes:
- `Create` must supply UUID (no DB default): `b.ID = uuid.New()` before INSERT
- `GetByPlatformAndRestaurantID` is used by order and menu ingest to resolve binding

---

### Step 5 · Store handler

**File to create:** `backend/internal/handlers/stores.go`

```
GET    /api/v1/stores           → StoreHandler.List
POST   /api/v1/stores           → StoreHandler.Create     (ADMIN only)
PUT    /api/v1/stores/{id}      → StoreHandler.Update     (ADMIN only)
DELETE /api/v1/stores/{id}      → StoreHandler.Deactivate (ADMIN only)
```

Auth: extract orgID from JWT context (same pattern as existing handlers).
Role check: create/update/delete require ADMIN role (see `handlers/authorization.go`).

---

### Step 6 · Platform binding handler

**File to create:** `backend/internal/handlers/platform_bindings.go`

```
GET    /api/v1/platform-bindings        → list (accepts ?store_id= filter)
POST   /api/v1/platform-bindings        → create (ADMIN only)
PUT    /api/v1/platform-bindings/{id}   → update (ADMIN only)
DELETE /api/v1/platform-bindings/{id}   → delete (ADMIN only)
```

---

### Step 7 · Wire routes in main/router

**File to modify:** wherever Chi routes are registered (likely `backend/cmd/server/main.go` or a router file)

Add:
```go
r.Route("/api/v1/stores", func(r chi.Router) {
    r.Use(middleware.Auth)
    r.Get("/", storeHandler.List)
    r.Post("/", storeHandler.Create)
    r.Put("/{id}", storeHandler.Update)
    r.Delete("/{id}", storeHandler.Deactivate)
})

r.Route("/api/v1/platform-bindings", func(r chi.Router) {
    r.Use(middleware.Auth)
    r.Get("/", bindingHandler.List)
    r.Post("/", bindingHandler.Create)
    r.Put("/{id}", bindingHandler.Update)
    r.Delete("/{id}", bindingHandler.Delete)
})
```

---

### Step 8 · Order ingest: store resolution

`order_repo.go` already does subquery-based resolution on INSERT — this is working but
resolves silently (NULL if no binding). No code change needed for Phase 1, but:

- Add `bound` bool to `GetOrders` response (derive: `store_id IS NOT NULL`)
- Add optional `?store_id=` filter to order list query

**File to modify:** `backend/internal/repository/order_repo.go`

---

### Step 9 · Menu ingest: store resolution

Same as orders. Menu repo already does subquery resolution.

**File to modify:** `backend/internal/repository/menu_repo.go`
- Add `bound` bool to list response
- Add optional `?store_id=` to list query

---

### Step 10 · Items list: optional store_id filter

**File to modify:** `backend/internal/repository/item_repo_sqlite.go`

Extend `ListWithFilters` signature to accept `storeID *uuid.UUID`:
- If nil → no WHERE on store_id (org-wide, current behavior)
- If set → add `AND store_id = ?`

**File to modify:** `backend/internal/repository/interfaces.go`
Update `ItemRepository.ListWithFilters` and `CountWithFilters` signatures.

**File to modify:** `backend/internal/handlers/inventory.go`
Read optional `?store_id=` query param and pass through.

---

### Step 11 · Dashboard: optional store_id filter

**File to modify:** `backend/internal/services/dashboard_service.go`
Accept optional storeID in summary queries.

---

### Step 12 · Auth/me: expose defaultStoreId

**File to modify:** `backend/internal/handlers/auth.go`
Add `defaultStoreId` to the `/me` response from the User domain object.
`users.default_store_id` is already in the DB and domain struct.

---

## Phase 2 — Web Frontend (React/Vite)

The web app uses React 19 + Vite + Zustand + React Query. Current structure:
- Shell: `Layout.tsx` — sidebar nav, no store context yet
- State: `authStore.ts` (Zustand), `inventoryStore.ts`
- API layer: `services/` (api.ts, inventory.ts, orders.ts, menu.ts, dashboard.ts)
- Hooks: `hooks/useInventory.ts`, `useOrders.ts`, `useDashboard.ts`
- Types: `types/inventory.ts` — no Store or PlatformBinding types yet

---

### Web Step 1 · Types

**File to modify:** `frontend/src/types/inventory.ts`

Add:
```ts
export interface Store {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformBinding {
  id: string;
  organizationId: string;
  storeId: string;
  platform: 'swiggy' | 'zomato';
  restaurantId: string;
  restaurantName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Add storeId to existing ListItemsQuery
// export interface ListItemsQuery { ..., storeId?: string }
```

Also add `defaultStoreId?: string` to the existing `User` interface.

---

### Web Step 2 · Global store state (Zustand)

**File to create:** `frontend/src/store/storeFilterStore.ts`

```ts
import { create } from 'zustand';

interface StoreFilterState {
  selectedStoreId: string | null;  // null = all stores (org-wide)
  setSelectedStoreId: (id: string | null) => void;
}

export const useStoreFilterStore = create<StoreFilterState>((set) => ({
  selectedStoreId: null,
  setSelectedStoreId: (id) => set({ selectedStoreId: id }),
}));
```

On login, initialize `selectedStoreId` from `user.defaultStoreId` if present.

---

### Web Step 3 · API service for stores and bindings

**File to create:** `frontend/src/services/stores.ts`

```ts
import { api } from './api';
import type { Store, PlatformBinding } from '../types/inventory';

export const storesService = {
  getStores: () => api.get<Store[]>('/stores'),
  createStore: (data) => api.post<Store>('/stores', data),
  updateStore: (id, data) => api.put<Store>(`/stores/${id}`, data),
  deleteStore: (id) => api.delete(`/stores/${id}`),

  getBindings: (storeId?: string) =>
    api.get<PlatformBinding[]>('/platform-bindings', { params: { storeId } }),
  createBinding: (data) => api.post<PlatformBinding>('/platform-bindings', data),
  updateBinding: (id, data) => api.put<PlatformBinding>(`/platform-bindings/${id}`, data),
  deleteBinding: (id) => api.delete(`/platform-bindings/${id}`),
};
```

---

### Web Step 4 · React Query hooks for stores and bindings

**File to create:** `frontend/src/hooks/useStores.ts`

```ts
export function useStores() { ... }
export function useCreateStore() { ... }
export function useUpdateStore() { ... }
export function useDeleteStore() { ... }
export function useBindings(storeId?: string) { ... }
export function useCreateBinding() { ... }
export function useUpdateBinding() { ... }
export function useDeleteBinding() { ... }
```

Pattern: identical to `useInventory.ts` — `useQuery` for reads, `useMutation` + `invalidateQueries` for writes.

---

### Web Step 5 · Store picker in Layout

**File to modify:** `frontend/src/components/Layout.tsx`

Add a store picker dropdown in the sidebar, below the logo section and above the nav links.

Behavior:
- Fetch stores with `useStores()`
- If org has ≤ 1 active store → render nothing (zero friction for single-store orgs)
- If org has > 1 store → render a `<select>` or custom dropdown:
  - Option: "All Stores" (value = null)
  - One option per active store
- On change → call `storeFilterStore.setSelectedStoreId(id)`
- Show current selection with a small `Store` icon (use `lucide-react`)

---

### Web Step 6 · Wire store filter into existing queries

**File to modify:** `frontend/src/hooks/useInventory.ts`
- `useItems` reads `selectedStoreId` from `useStoreFilterStore` and adds it to `query`

**File to modify:** `frontend/src/hooks/useDashboard.ts`
- Dashboard summary query accepts and passes `storeId`

**File to modify:** `frontend/src/hooks/useOrders.ts`
- Orders list query accepts and passes `storeId`

Pattern for each:
```ts
const selectedStoreId = useStoreFilterStore(s => s.selectedStoreId);
// include selectedStoreId in queryKey so React Query refetches on change
// pass storeId to service call
```

---

### Web Step 7 · Admin: Stores screen

**File to create:** `frontend/src/pages/StoresPage.tsx`

Route: `/admin/stores` (ADMIN only — redirect non-admins)

Features:
- List all stores (name, code, primary badge, active status)
- Create store modal (name + code + isPrimary toggle)
- Edit store inline or modal (name, code, set as primary)
- Deactivate store (soft delete — confirm dialog)

**File to modify:** `frontend/src/App.tsx`
Add route: `<Route path="/admin/stores" element={<StoresPage />} />`

**File to modify:** `frontend/src/components/Layout.tsx`
Add nav item "Stores" under an "Admin" section label (only shown to ADMIN role).
Use `canManageCategories` or add `isAdmin(role)` util from `utils/roles.ts`.

---

### Web Step 8 · Admin: Platform bindings screen

**File to create:** `frontend/src/pages/PlatformBindingsPage.tsx`

Route: `/admin/bindings` (ADMIN only)

Features:
- List all bindings (platform pill, restaurant ID, restaurant name, store name, active toggle)
- Create binding modal (store select, platform select, restaurant ID, restaurant name)
- Edit binding (restaurant name + active toggle)
- Delete binding (confirm dialog)
- Unbound indicator: if a binding's store is missing or inactive, flag it visually

Add nav item in Layout's Admin section.

---

### Web Step 9 · Orders and menu: bound/unbound badge

**File to modify:** `frontend/src/pages/OrdersPage.tsx`
- Show a small badge per order row: `Bound` (green) or `Unbound` (amber/gray)
- Bound = `order.storeId` is set; display store name if available

**File to modify:** `frontend/src/pages/MenuPage.tsx`
- Same bound/unbound badge on menu rows

---

## Phase 3 — Flutter App (after web Phase 2)

After Phase 1 backend is complete and deployed.

| Task | Screen/Widget |
|---|---|
| Global store picker | AppScaffold — StateNotifier/Riverpod provider |
| Admin Stores screen | New screen: list + CRUD modals |
| Admin Bindings screen | New screen: list + CRUD modals |
| Orders bound badge | OrdersScreen — existing row widget |
| Menu bound badge | MenuPage — existing row widget |
| Inventory store filter | Pass storeId from global picker to items query |
| Dashboard store filter | Pass storeId from global picker to dashboard query |

Flutter implementation follows the same logical steps as the web but uses Riverpod providers instead of Zustand and Dio instead of fetch.

---

## File Creation Summary

### New files (backend)
- `backend/internal/domain/store.go`
- `backend/internal/domain/platform_binding.go`
- `backend/internal/repository/store_repo.go`
- `backend/internal/repository/platform_binding_repo.go`
- `backend/internal/handlers/stores.go`
- `backend/internal/handlers/platform_bindings.go`
- `backend/migrations/sqlite/000005_add_store_is_active.up.sql`
- `backend/migrations/sqlite/000005_add_store_is_active.down.sql`

### Modified files (backend)
- `backend/internal/repository/interfaces.go` — add StoreRepository, PlatformBindingRepository interfaces; extend ItemRepository
- `backend/internal/repository/item_repo_sqlite.go` — add storeID filter
- `backend/internal/repository/order_repo.go` — add bound field, store filter
- `backend/internal/repository/menu_repo.go` — add bound field, store filter
- `backend/internal/services/dashboard_service.go` — add store filter
- `backend/internal/handlers/inventory.go` — pass store filter
- `backend/internal/handlers/auth.go` — expose defaultStoreId
- Router/main — register new routes

### New files (web frontend)
- `frontend/src/store/storeFilterStore.ts`
- `frontend/src/services/stores.ts`
- `frontend/src/hooks/useStores.ts`
- `frontend/src/pages/StoresPage.tsx`
- `frontend/src/pages/PlatformBindingsPage.tsx`

### Modified files (web frontend)
- `frontend/src/types/inventory.ts` — add Store, PlatformBinding types; extend User, ListItemsQuery
- `frontend/src/components/Layout.tsx` — store picker + Admin nav section
- `frontend/src/App.tsx` — add /admin/stores, /admin/bindings routes
- `frontend/src/hooks/useInventory.ts` — pass storeId from global filter
- `frontend/src/hooks/useDashboard.ts` — pass storeId from global filter
- `frontend/src/hooks/useOrders.ts` — pass storeId from global filter
- `frontend/src/pages/OrdersPage.tsx` — bound/unbound badge
- `frontend/src/pages/MenuPage.tsx` — bound/unbound badge

---

## Sequence Recommendation

**Backend first (Steps 1–12)** — all frontend work depends on the API existing.

Within backend: Steps 1–2 (domains) → Steps 3–4 (repos) → Steps 5–6 (handlers) → Step 7 (routes) → Steps 8–12 (filter extensions). Steps 8–12 are independent of each other.

**Web frontend (Web Steps 1–9)** — after backend is deployed.

Within web: Steps 1–4 (types, state, service, hooks) are prerequisites for all UI steps. Steps 5–9 can proceed in any order after that.
