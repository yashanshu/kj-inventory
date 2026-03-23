# Depletion Tracking Plan

## Goal

Ship inventory depletion tracking in a safe rollout:

- `disabled`: no order-based depletion processing
- `shadow`: process orders and estimate depletion without mutating stock
- `live`: process orders and apply depletion to inventory automatically

The feature must remain gated until a restaurant completes the required configuration.

## Constraints

- External orders are ingested without `organization_id`.
- Inventory is organization-scoped.
- Manual stock movement is not yet the operational source of truth.

## Design

### 1. Organization bridge

Create an organization-scoped restaurant binding:

- map `platform + restaurant_id` to `organization_id`
- allow multiple restaurant IDs per org

This lets public order ingestion resolve the target organization safely.

### 2. Configuration model

Store per-organization depletion settings:

- mode: `disabled | shadow | live`
- readiness status: `configuring | ready`
- optional notes and timestamps

### 3. Menu item mapping

Create exact depletion mappings from ordered menu items to inventory items:

- organization
- platform
- restaurant
- menu item name
- optional variant key
- inventory item
- quantity per ordered unit

Start with exact matching on normalized item name + variant.

### 4. Depletion ledger

Store per-order depletion processing records:

- organization
- platform
- external order id
- restaurant id
- last seen order status
- applied mode (`shadow` or `live`)
- whether stock mutation was applied
- mapped/unmapped counts
- estimated consumption JSON

This ledger provides idempotency, cancellation reversal, and auditability.

### 5. Processing rules

- On order ingest:
  - resolve org via restaurant binding
  - parse order items from `items_json`
  - match items against mappings
  - write/update depletion ledger
- In `shadow` mode:
  - compute estimates only
- In `live` mode:
  - apply stock deduction once for active orders
  - reverse stock if the order later becomes cancelled

## Readiness criteria

An organization is `ready` when:

- at least one restaurant binding exists
- at least one depletion mapping exists
- recent mapped coverage is high enough to be useful

For the first implementation, readiness is reported using:

- bound restaurants
- mapping count
- recent total order items
- recent mapped order items
- coverage percent

## API slice

### Protected

- `GET /api/v1/depletion/status`
- `GET /api/v1/depletion/insights`
- `GET /api/v1/depletion/restaurants`
- `POST /api/v1/depletion/restaurants`
- `GET /api/v1/depletion/mappings`
- `POST /api/v1/depletion/mappings`
- `POST /api/v1/depletion/mode`

### Public/internal processing

- extend order ingestion to trigger depletion processing

## Delivery phases

- [x] Phase 1: Save rollout plan
- [ ] Phase 2: Add schema for bindings, config, mappings, and ledger
- [ ] Phase 3: Build depletion processing service
- [ ] Phase 4: Add protected configuration and insight endpoints
- [ ] Phase 5: Enable live stock mutation with reversal handling
- [ ] Phase 6: Verify with targeted tests

## Progress Notes

- Initial plan saved before implementation.
