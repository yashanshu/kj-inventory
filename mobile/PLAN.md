# Flutter Mobile App for KJ Inventory

## Context

The KJ Inventory system is a restaurant inventory management platform with a Go backend API, React frontend, and a Swiggy order scraper with multi-channel notifications (Telegram, WhatsApp, FCM). The existing frontend is web-only. This plan adds a Flutter mobile app (Android + iOS) to receive push notifications for new orders, manage inventory, view orders, and browse menus — all consuming the existing REST API.

## Development Pattern: Feature-Driven

Each feature is built end-to-end in one pass: **model → repository → provider → screen → tests**

- **Models + Repositories**: Write unit tests for JSON deserialization and repository methods as each feature is built
- **Providers**: Test state transitions and error handling with mock repositories
- **Screens**: Build UI last, manual testing primarily (widget tests for complex interactive components only)
- **No separate "testing phase"** — tests ship with each feature

## Architecture

**Location:** `mobile/` directory in the monorepo
**State Management:** Riverpod with code generation
**HTTP Client:** Dio with interceptors
**Navigation:** GoRouter with auth redirect
**Models:** Freezed + json_serializable
**Push Notifications:** Firebase Cloud Messaging (FCM already set up in scraper)

## Project Structure

```
mobile/lib/
├── main.dart                           # Firebase init, run app
├── app.dart                            # MaterialApp + GoRouter
├── core/
│   ├── constants/
│   │   └── api_constants.dart          # Endpoints, base URL
│   ├── network/
│   │   ├── api_client.dart             # Dio wrapper, {data} unwrapping, error mapping
│   │   └── auth_interceptor.dart       # Bearer token injection, 401 → logout
│   ├── storage/
│   │   └── secure_storage.dart         # flutter_secure_storage for JWT
│   └── theme/
│       └── app_theme.dart              # Material 3 theme, category colors
├── models/                             # Freezed models matching backend JSON
│   ├── user.dart                       # User, Role enum
│   ├── item.dart                       # Item (display units from API)
│   ├── category.dart
│   ├── movement.dart                   # StockMovement, MovementType enum
│   ├── alert.dart                      # Alert, AlertType, AlertSeverity enums
│   ├── order.dart                      # ExternalOrder, OrderStats
│   ├── menu.dart                       # RestaurantMenu
│   └── dashboard.dart                  # DashboardMetrics, StockTrend, CategoryBreakdown
├── repositories/                       # Thin API call wrappers returning typed models
│   ├── auth_repository.dart
│   ├── inventory_repository.dart       # Items + Categories
│   ├── movement_repository.dart
│   ├── dashboard_repository.dart
│   ├── order_repository.dart
│   └── menu_repository.dart
├── providers/                          # Riverpod providers (code-gen)
│   ├── auth_provider.dart              # AsyncNotifier: login/logout/auto-login
│   ├── inventory_provider.dart         # Items with search/filter/pagination
│   ├── category_provider.dart
│   ├── movement_provider.dart
│   ├── dashboard_provider.dart
│   ├── order_provider.dart
│   ├── menu_provider.dart
│   └── notification_provider.dart      # FCM token + notification state
├── features/
│   ├── auth/
│   │   └── login_screen.dart
│   ├── dashboard/
│   │   ├── dashboard_screen.dart       # Metric cards, charts, low stock, alerts
│   │   └── widgets/                    # metric_card, stock_trend_chart, category_pie_chart
│   ├── inventory/
│   │   ├── items_screen.dart           # List with search + category filter
│   │   ├── item_detail_screen.dart     # Stock info + movement history
│   │   ├── item_form_screen.dart       # Create/edit (ADMIN only)
│   │   └── widgets/                    # item_tile, stock_badge
│   ├── movements/
│   │   └── add_movement_screen.dart    # IN/OUT/ADJUSTMENT form
│   ├── orders/
│   │   ├── orders_screen.dart          # Platform filter tabs + stats
│   │   └── order_detail_screen.dart
│   ├── menu/
│   │   ├── menu_screen.dart            # Restaurant list
│   │   └── menu_detail_screen.dart     # Categories + offers
│   ├── alerts/
│   │   └── alerts_screen.dart          # Alert list with mark-as-read
│   └── settings/
│       └── settings_screen.dart        # Change password, logout
└── widgets/                            # Shared: app_scaffold (bottom nav), loading, empty_state, error_widget
```

## Key Dependencies (pubspec.yaml)

| Package | Purpose |
|---------|---------|
| `flutter_riverpod` + `riverpod_annotation` | State management |
| `dio` | HTTP client |
| `go_router` | Navigation + auth redirect |
| `flutter_secure_storage` | JWT token persistence |
| `firebase_core` + `firebase_messaging` | FCM push notifications |
| `flutter_local_notifications` | Show notifications when app is in foreground |
| `fl_chart` | Stock trend + category breakdown charts |
| `freezed` + `json_serializable` | Immutable models with JSON serialization |
| `intl` | Date/currency formatting (IST, ₹) |

## Data Models (match backend JSON exactly)

Models derived from `backend/internal/domain/` and `frontend/src/types/inventory.ts`:

- **Item**: id, organizationId, categoryId, name, sku?, unit, minimumThreshold (float), currentStock (float), unitCost?, isActive, trackStock, timestamps, category?
- **Category**: id, organizationId, name, description?, color?, timestamps
- **StockMovement**: id, itemId, movementType (IN/OUT/ADJUSTMENT), quantity, previousStock, newStock, reference?, notes?, createdBy, createdAt, item?, user?
- **Alert**: id, organizationId, itemId?, type (LOW_STOCK/OUT_OF_STOCK), severity (INFO/WARNING/CRITICAL), title, message, isRead, createdAt, item?
- **ExternalOrder**: id, platform, externalOrderId, orderDate, customerName?, totalAmount, status, itemsJson (parse client-side), createdAt
- **DashboardMetrics**: totalItems, lowStockCount, outOfStockCount, totalValue, recentMovements
- **StockTrend**: date, in, out, adjustments
- **CategoryBreakdown**: categoryId, categoryName, itemCount, totalValue, color?

## API Integration

**Base URL**: configurable via `--dart-define=API_BASE_URL=http://host:8888/api/v1`

**Auth flow**:
1. On startup: read JWT from secure storage → call `GET /auth/profile` to validate → if 401, clear and show login
2. Login: `POST /auth/login` → store JWT + user
3. All requests: `Authorization: Bearer <token>` via Dio interceptor
4. On 401 response: clear token, redirect to login

**Role-based UI** (ADMIN/MANAGER/USER):
- ADMIN: full CRUD on items/categories, record movements, view costs
- MANAGER: record movements, view data (no CRUD, no costs)
- USER: read-only

## FCM Push Notifications

The scraper (`scraper/src/notifier.ts`) already sends FCM notifications with:
- **Token-based delivery** (single device via `config.firebaseFcmToken`)
- **Android channel**: `orders` with high priority
- **Data payload**: `{orderId, platform, restaurantId, totalAmount}`
- **Notification types**: new order, cancellation, session expired, scraper error

**Flutter integration**:
1. Run `flutterfire configure` using the same Firebase project
2. Create Android notification channel "orders" (high importance)
3. On app launch, get FCM token → log it for manual config in scraper's `FIREBASE_FCM_TOKEN` env (Phase 1 approach)
4. Handle foreground messages → show local notification via `flutter_local_notifications`
5. Handle notification taps → navigate to orders screen
6. Handle background/terminated → `FirebaseMessaging.onBackgroundMessage`

**Future enhancement**: Add `POST /auth/fcm-token` backend endpoint so the app auto-registers its token.

## Navigation

**Bottom nav tabs**: Dashboard | Inventory | Orders | Menu
**App bar**: Bell icon (alerts badge) + profile/settings menu
**GoRouter** with `ShellRoute` for bottom nav persistence and auth redirect guard

## Implementation Phases

### Phase 1: Foundation + Auth — DONE
- [x] `flutter create --org com.kjinventory mobile`
- [x] Add all dependencies to `pubspec.yaml`
- [x] Build `core/`: ApiClient (Dio + interceptors), SecureStorage, ApiConstants, AppTheme
- [x] Build all `models/` with freezed, run `build_runner`
- [x] **Tests**: Unit tests for all model JSON deserialization (fromJson/toJson round-trip) — 7 test files
- [x] Build `AuthRepository` + `authProvider`
- [ ] **Tests**: Auth repository tests with mock Dio, auth provider state transition tests
- [x] Build `LoginScreen`, GoRouter with auth redirect, `AppScaffold` with bottom nav

### Phase 2: Dashboard — DONE
- [x] `DashboardRepository` + `dashboardProvider`
- [ ] **Tests**: Dashboard repo tests, provider tests for data aggregation
- [x] Dashboard screen: metric cards, stock trend bar chart (7 days), category pie chart, low stock list, recent alerts with unread badge

### Phase 3: Inventory + Movements — DONE
- [x] `InventoryRepository` + `inventoryProvider` + `categoryProvider`
- [ ] **Tests**: Inventory repo CRUD tests, provider search/filter/pagination tests
- [x] Items list screen: search, category filter, low-stock toggle, infinite scroll pagination
- [x] Item detail screen: stock info + movement history
- [x] Item form screen: create/edit (ADMIN gated)
- [x] `MovementRepository` + `movementProvider`
- [ ] **Tests**: Movement repo tests, provider tests
- [x] Add movement screen: type selector, quantity, notes, reference
- [x] Pull-to-refresh everywhere

### Phase 4: Orders + Menu — DONE
- [x] `OrderRepository` + `orderProvider`
- [x] **Tests**: `itemsJson` parsing tests (in order_test.dart), malformed JSON handling
- [x] Orders screen: platform filter tabs, order stats card, paginated list
- [x] Order detail: items parsed from `itemsJson`, amounts, customer info
- [x] `MenuRepository` + `menuProvider`
- [x] **Tests**: Menu repo tests, JSON parsing for offersJson/categoriesJson (in menu_test.dart)
- [x] Menu screen: restaurant cards → menu detail with categories + offers

### Phase 5: FCM + Alerts + Settings — CODE DONE, FIREBASE SETUP PENDING
- [ ] Firebase setup via `flutterfire configure` *(requires Flutter SDK installed)*
- [x] FCM notification service: token retrieval, Android channel "orders", foreground/background/terminated handlers
- [x] Deep link support from notification tap (pending notification data consumer)
- [x] Alerts screen with severity coloring, unread badge in app bar
- [ ] **Tests**: Alert provider tests (mark-as-read state), notification routing tests
- [x] Settings: change password dialog, logout with confirmation
- [ ] Error/loading/empty states polish *(basic states done, shimmer loading not yet added)*

## Progress Summary

| Phase | Status | Code | Tests |
|-------|--------|------|-------|
| Phase 1: Foundation + Auth | **Done** | 100% | Model tests done, repo/provider tests pending |
| Phase 2: Dashboard | **Done** | 100% | Pending |
| Phase 3: Inventory + Movements | **Done** | 100% | Pending |
| Phase 4: Orders + Menu | **Done** | 100% | JSON parsing tests done |
| Phase 5: FCM + Alerts + Settings | **Code done** | 90% | Pending |

**Overall: ~90% complete** — All Dart code is written (46 source files, 7 test files). Remaining work:
1. Install Flutter SDK and run `flutter create .` to generate platform projects (android/, ios/)
2. Run `flutter pub get` and `dart run build_runner build` to generate freezed code
3. Run `flutterfire configure` to set up Firebase
4. Uncomment Firebase init in `main.dart`
5. Write remaining unit tests (repo + provider tests)
6. Add shimmer loading placeholders

## Key Files to Reference During Implementation

| Reference | Path |
|-----------|------|
| Backend domain models | `backend/internal/domain/*.go` |
| Display unit conversion | `backend/internal/domain/item_display.go` |
| API route definitions | `backend/cmd/server/main.go` |
| TypeScript type definitions | `frontend/src/types/inventory.ts` |
| Frontend API client pattern | `frontend/src/services/api.ts` |
| FCM notification payload | `scraper/src/notifier.ts` (lines 100-128) |
| Backend alert model | `backend/internal/domain/alert.go` |

## Verification

1. **Build**: `cd mobile && flutter build apk --debug` (Android) and `flutter build ios --debug` (iOS)
2. **Auth**: Login with `admin@restaurant.local` / `admin123`, verify token persistence across app restart
3. **API**: Verify all screens load data from backend (run backend locally with `go run ./cmd/server`)
4. **FCM**: After first launch, copy logged FCM token → set as `FIREBASE_FCM_TOKEN` in scraper env → send test notification via `POST /poll-now` on scraper
5. **Role gates**: Login as staff user, verify CRUD buttons hidden, movement recording works for MANAGER
