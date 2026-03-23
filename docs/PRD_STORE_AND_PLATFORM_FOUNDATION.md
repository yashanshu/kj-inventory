# PRD: Store And Platform Foundation

## Status

Ready for Implementation

---

## Context: What the Schema Already Has

The database migrations (001–004) already define the core data model this PRD builds on.
No schema changes are needed for Phase 1 or Phase 2. This PRD is purely a backend API
and frontend product layer on top of an existing, correct schema.

| Table | Status |
|---|---|
| `organizations` | ✓ exists |
| `stores` (id, org, name, code, is_primary, metadata_json) | ✓ exists |
| `users.default_store_id` | ✓ exists |
| `categories` (org-scoped) | ✓ exists |
| `items` (store-scoped, store_id FK) | ✓ exists |
| `platform_store_bindings` (platform, restaurant_id, store_id, is_active) | ✓ exists |
| `external_orders` (store_id, platform_binding_id, nullable) | ✓ exists |
| `restaurant_menus` (store_id, platform_binding_id, nullable) | ✓ exists |

**Schema gap:** `stores` stores optional address/contact inside `metadata_json` only.
No dedicated columns. This is acceptable for V1 — structured address columns are deferred.

---

## Why This PRD Exists

The schema is aligned around `organization → store → item`, with platform restaurant IDs
as external bindings rather than ownership keys. The product layer does not yet expose
this model. The app currently behaves as a single-organization, single-store system
with no store selection, no platform binding management, and no store-aware filtering.

This PRD ships the first store-aware product slice, making `store` a visible concept
in both the API and the UI.

---

## Problem

Today the app has five structural gaps:

1. No store CRUD API — stores cannot be created, listed, or managed in the product.
2. No platform binding API — Swiggy/Zomato restaurant IDs cannot be assigned to stores in the product.
3. Inventory list and movements ignore `store_id` as a filter dimension.
4. Scraped orders and menus carry `platform`/`restaurant_id` but the ingest path does not resolve `platform_binding_id` or `store_id` at write time.
5. The UI has no global store context — there is no way to scope any view to a store.

---

## Product Goal

After this release an admin can:

- list and manage stores under the organization
- set one store as primary
- bind a Swiggy or Zomato restaurant ID to a store
- see organization-wide data across all stores by default
- filter any supported screen to one store via a global filter
- see scraped orders and menus resolved to the correct store
- operate inventory at the organization level or narrow to one store

---

## Users

- **Owner / Admin** — full store and binding management
- **Store Manager** — read all stores, manage own store data
- **Staff / User** — operates within scoped view; no store management

---

## Goals

- Make `store` a visible product concept.
- Keep `organization` as the top-level business boundary.
- Treat `platform + restaurant_id` as external identity only (binding, not ownership).
- Default all data views to organization-wide all-store visibility.
- Add one reusable global store filter across modules.
- Preserve current single-store behavior by default via the primary store.
- Prepare the system for depletion without enabling it yet.

## Non-Goals

- No recipe / BOM authoring.
- No automatic depletion.
- No payroll, GST, billing, or accounting workflows.
- No deep role matrix changes beyond current ADMIN / MANAGER / USER.
- No structured address columns on `stores` (use metadata_json for V1).

---

## User Stories

### Admin

- As an admin, I can list all stores in the organization.
- As an admin, I can create a new store (name + code required).
- As an admin, I can update a store's name, code, and primary flag.
- As an admin, I can deactivate a store.
- As an admin, I can set one store as the primary store.
- As an admin, I can bind a Swiggy or Zomato restaurant ID to a store.
- As an admin, I can deactivate a platform binding without deleting it.
- As an admin, I can see which orders and menus are bound vs unbound.
- As an admin, I can filter any screen to a specific store using a global store picker.

### Manager

- As a manager, I can view organization-wide data by default and narrow to my store.
- As a manager, I can trust that platform orders arrive tagged to the correct store.

### Operations (future)

- As an operations user, I can attach payroll, expenses, GST, and billing to the same store entity without schema rewrites.

---

## Functional Requirements

### 1. Store management API

- `GET /api/v1/stores` — list all active stores for the authenticated org
- `POST /api/v1/stores` — create store (name + code required; is_primary optional)
- `PUT /api/v1/stores/{id}` — update name, code, is_primary, metadata
- `DELETE /api/v1/stores/{id}` — soft-delete / deactivate (set is_active = false)
- Enforcing uniqueness: `(organization_id, code)` already unique in schema
- Enforcing primary: when a store is set as primary, clear is_primary on all other stores in the org first (single-transaction)
- Store domain type: `Store { ID, OrganizationID, Name, Code, IsPrimary, IsActive, Metadata, CreatedAt, UpdatedAt }`

### 2. Platform binding API

- `GET /api/v1/platform-bindings` — list bindings for the org (optionally filter by store)
- `POST /api/v1/platform-bindings` — create binding (store_id, platform, restaurant_id, restaurant_name)
- `PUT /api/v1/platform-bindings/{id}` — update restaurant_name or is_active
- `DELETE /api/v1/platform-bindings/{id}` — hard-delete (or deactivate via PUT)
- Uniqueness: `(platform, restaurant_id)` already enforced in schema
- Platform binding domain type: `PlatformBinding { ID, OrganizationID, StoreID, Platform, RestaurantID, RestaurantName, IsActive, CreatedAt, UpdatedAt }`

### 3. Store-aware order ingest

- When a scraper POSTs an order, it must include: `platform`, `restaurantId`, `restaurantName`
- Backend resolves `platform_binding_id` and `store_id` by looking up the binding at write time
- If no binding exists, order is stored with `store_id = NULL`, `platform_binding_id = NULL` (already the schema default)
- Orders should expose `storeId` and `bound` (bool) in list responses

### 4. Store-aware menu ingest

- Same resolution logic as orders
- Menu snapshots expose `storeId` and `bound` in responses

### 5. Store-aware inventory filtering

- `GET /api/v1/items` accepts optional `?store_id=` query param
- No store filter → organization-wide view (current behavior, unchanged)
- With store filter → restrict to that store's items
- `GET /api/v1/movements` accepts optional `?store_id=` query param (join through items)
- Dashboard aggregates remain org-wide by default; add optional store filter

### 6. User default store

- Exposed on the `GET /api/v1/auth/me` response as `defaultStoreId`
- Updatable via `PUT /api/v1/auth/me` (or a dedicated profile endpoint)
- UI uses this to preselect the global store filter for the user; no server-side enforcement

### 7. Depletion readiness (reporting only, no action)

- The system must be able to answer:
  - which stores have active platform bindings
  - which stores are receiving orders
  - which stores have menus
  - how many orders/menus are unbound
- This is a prerequisite gate before any depletion PRD.

---

## UX Requirements

### Global store filter

- A store picker lives in the authenticated product shell (top bar or drawer header)
- Options: "All Stores" (default) + one entry per active store in the org
- Selected store is held in app-level state (not in URL in V1, but consider it for V2)
- All store-aware screens read from this shared state
- Single-store orgs: picker is hidden (no UI noise for the common case)

### Admin screens (new)

- **Stores screen**: list, create, edit, set primary, deactivate
- **Platform bindings screen**: list, create, edit (restaurant name, active flag), delete

### Order and menu screens

- Show a `Bound` / `Unbound` badge per row
- Unbound rows display the raw `restaurant_id` without a store name

### Inventory screen

- Respects global store filter
- No other UX change in V1

---

## Data Model Summary

All tables already exist. No migration needed for Phase 1 or Phase 2.

| Entity | Scope | Notes |
|---|---|---|
| `organizations` | top-level | unchanged |
| `stores` | per org | needs store CRUD API |
| `users.default_store_id` | per user | expose in /me response |
| `categories` | org-scoped | unchanged |
| `items` | store-scoped | add optional store filter |
| `platform_store_bindings` | per org+store | needs binding CRUD API; UUID default missing |
| `external_orders` | nullable store | resolve binding on ingest |
| `restaurant_menus` | nullable store | resolve binding on ingest |

**Schema fix needed:** `platform_store_bindings.id` uses `TEXT PRIMARY KEY` but has no DEFAULT UUID expression (unlike all other tables). A migration is needed to add the UUID default, or the backend must supply the UUID on insert.

---

## API Surface

### New endpoints

```
GET    /api/v1/stores
POST   /api/v1/stores
PUT    /api/v1/stores/{id}
DELETE /api/v1/stores/{id}

GET    /api/v1/platform-bindings
POST   /api/v1/platform-bindings
PUT    /api/v1/platform-bindings/{id}
DELETE /api/v1/platform-bindings/{id}
```

### Modified endpoints (store-aware filter)

```
GET /api/v1/items              ?store_id=   (optional)
GET /api/v1/movements          ?store_id=   (optional)
GET /api/v1/dashboard/summary  ?store_id=   (optional)
GET /api/v1/orders             ?store_id=   (optional)
GET /api/v1/menus              ?store_id=   (optional)
```

### Ingest endpoints (scraper → backend)

```
POST /api/v1/orders/ingest     body includes platform, restaurantId, restaurantName
POST /api/v1/menus/ingest      body includes platform, restaurantId, restaurantName
```

### Auth / profile

```
GET /api/v1/auth/me            response includes defaultStoreId
PUT /api/v1/auth/me            accepts defaultStoreId update
```

---

## Implementation Phases

### Phase 1 — Backend API (no frontend changes)

1. Add `Store` domain type and `StoreRepository` interface + SQLite implementation
2. Add `PlatformBinding` domain type and `PlatformBindingRepository` interface + SQLite implementation
3. Wire store CRUD handlers (GET, POST, PUT, DELETE)
4. Wire platform binding CRUD handlers
5. Fix `platform_store_bindings.id` UUID generation (supply from backend on insert)
6. Update order ingest to resolve and write `platform_binding_id` + `store_id`
7. Update menu ingest to resolve and write `platform_binding_id` + `store_id`
8. Add optional `?store_id=` filter to items, movements, orders, menus, dashboard endpoints
9. Expose `defaultStoreId` on `/auth/me`; accept updates

### Phase 2 — Frontend (Flutter + web)

1. Store picker widget in AppScaffold / global shell
2. Admin: Stores screen (list + CRUD)
3. Admin: Platform bindings screen (list + CRUD)
4. Orders screen: bound/unbound badge, store name
5. Menus screen: bound/unbound badge, store name
6. Inventory screen: pass global store filter to items query
7. Dashboard: pass global store filter to summary query

### Phase 3 — Polish and depletion gate

1. User default store: preselect in store picker on login
2. Unbound data alert surface for admins
3. Depletion readiness checklist screen (read-only)

---

## Success Metrics

- Admin can create a second store without touching the database directly.
- Admin can bind a Swiggy restaurant ID to a store via the product UI.
- 100% of scraped orders for configured restaurants resolve to a store at ingest time.
- 100% of scraped menu snapshots for configured restaurants resolve to a store.
- Global store filter narrows all supported views correctly.
- Single-store orgs see no added UX friction (picker hidden).
- Dashboard and inventory views work correctly with no store filter (org-wide) and with one.

---

## Risks

| Risk | Mitigation |
|---|---|
| Existing order/menu ingest ignores binding resolution | Fix in Phase 1; test with payload fixtures |
| `platform_store_bindings.id` has no UUID default | Backend supplies UUID on insert in Phase 1 |
| Store picker adds noise for single-store orgs | Hide picker when org has ≤ 1 active store |
| Legacy frontend state hardcodes org-level queries | Audit and add store_id param passthrough in Phase 2 |
| Platform binding uniqueness errors on re-ingest | Surface clear conflict error in API response |

---

## Exit Criteria

This PRD is complete when:

- `store` is a first-class product concept with full CRUD via the API
- the default product view shows organization-wide data across all stores
- a global store filter can narrow data to one store
- platform restaurant IDs are managed as bindings via the API
- scraped orders and menus resolve to stores at ingest time
- inventory, movements, orders, menus, and dashboard respect the optional store filter
- the system is ready for a separate depletion PRD without another schema change
