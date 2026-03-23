# KJ Inventory — Sprint Plan

> **Branch:** `mobile` | **App:** Flutter (Android + iOS)
> **Context:** App is ~90% code-complete. Sprint order revised 2026-03-05.

## Execution Order

| # | Sprint | Duration | Status |
|---|--------|----------|--------|
| 1 | Sprint 1 — Inventory UX Overhaul | 1 week | **DONE** ✓ |
| 2 | Design Sprint — Professional UI | 3 days | Pending |
| 3 | Sprint 1.5 — Complete Offline Support | 1.5 weeks | Pending |
| 4 | Sprint 2 — Expense Tracker | 2 weeks | Pending |

> **Why this order:** Finish Sprint 1 integration first. Then design sprint reskins every screen with Inter font, new theme, and polished components — all new Sprint 1.5 and Sprint 2 screens start life already styled. Sprint 1.5 (offline infra) comes before Sprint 2 so the expense feature writes to an already-stable offline layer.

---

## Sprint 1 — Inventory UX Overhaul (1 week)

**Goal:** Make inventory management feel native and effortless. No new backend work. Pure Flutter UX improvements.

**Outcome:** A user can check stock and record a movement in under 5 seconds, without navigating away from the list.

**Status:** COMPLETE. All widgets written and fully integrated.

---

### S1-1 · Stock Health Bar Widget — DONE
**File:** `mobile/lib/features/inventory/widgets/stock_health_bar.dart`

A visual bar that fills proportionally to `currentStock / minimumThreshold * buffer`.
- Green: stock ≥ 2× threshold
- Amber: stock between threshold and 2× threshold
- Red: stock below threshold (already low-stock)
- Out-of-stock: empty bar with distinct indicator

```dart
// Usage on ItemTile:
StockHealthBar(current: item.currentStock, threshold: item.minimumThreshold)
```

---

### S1-2 · Category Chip Bar — DONE
**File:** `mobile/lib/features/inventory/widgets/category_chip_bar.dart`

Horizontal scrolling `FilterChip` row replacing the dropdown.
- "All" chip always first
- Each category shown as a chip; tap selects it (single-select)
- Active chip uses `FilledChip` style (filled background)
- Reads from existing `categoriesProvider`

Replaces the `DropdownButtonFormField` in `items_screen.dart`.

---

### S1-3 · Quick Adjust Bottom Sheet — DONE
**File:** `mobile/lib/features/inventory/widgets/quick_adjust_sheet.dart`

A `showModalBottomSheet` triggered by swiping an item tile.

**UI layout:**
```
Item name + current stock (subtitle)
─────────────────────────────────────
[  Stock In  ][  Stock Out  ]    ← SegmentedButton, pre-selected by swipe direction
     [−]    [ 5 ]    [+]         ← large tap targets; tap number field to type exact value
  Notes ________________         ← optional, single line, not shown by default
─────────────────────────────────────
         [ SAVE ]
```

**Smart defaults:**
- Left swipe → pre-select Stock Out
- Right swipe → pre-select Stock In
- If `currentStock < minimumThreshold` → default to Stock In regardless of swipe
- Default quantity: 1
- `[+]` and `[−]` increment/decrement by 1 (or common unit step)

**On save:** calls `MovementRepository.createMovement()`, invalidates `inventoryProvider`, pops sheet, shows `SnackBar`.

---

### S1-4 · Item Tile — Swipe Gesture + Stock Bar — DONE
**File:** `mobile/lib/features/inventory/widgets/item_tile.dart`

Wrap `ItemTile` with `Slidable` from `flutter_slidable`.

**Swipe reveals:**
- Right swipe (green action): Stock In → opens `showQuickAdjustSheet(swipeDirection: 1)`
- Left swipe (red action): Stock Out → opens `showQuickAdjustSheet(swipeDirection: -1)`
- Tap tile: navigate to item detail (unchanged)

Add `StockHealthBar(current: item.currentStock, threshold: item.minimumThreshold)` below the subtitle row.

**Add `flutter_slidable: ^3.1.1`** to `pubspec.yaml`.

---

### S1-5 · Grouped Inventory List + CategoryChipBar integration — DONE
**File:** `mobile/lib/features/inventory/items_screen.dart`
**File:** `mobile/lib/providers/inventory_provider.dart`

`items_screen.dart` still uses the old `DropdownButtonFormField`. Replace with `CategoryChipBar`.

Refactor `ListView.builder` to group items by category with sticky section headers using `grouped_list: ^5.1.2`.

**New provider in `inventory_provider.dart`:** `groupedItemsProvider` — derived from `inventoryProvider.items` and `categoriesProvider`, returns `List<({String categoryName, String color, List<Item> items})>`.

**Add `grouped_list: ^5.1.2`** to `pubspec.yaml`.

**Result:**
```
🔍 Search...
[All][Dry][Frozen][Perishable][Pack.]

DRY ITEMS ─────────────────────────
  → Salt          12 kg  ████████░░
  → Onion ⚠️       2 kg  ██░░░░░░░░

PACKAGING ──────────────────────────
  → Boxes         50 pcs ██████████
```

---

### S1-6 · Speed Dial FAB (Admin only) — DONE
**File:** `mobile/lib/features/inventory/items_screen.dart`

Replace `AddItemFab` with speed dial (requires `flutter_speed_dial: ^7.0.0`):
- Primary FAB: `+` icon, expands on tap
- Child 1: "Add Item" → `/inventory/new`
- Child 2: "Record Movement" → `/movements/add`

**Add `flutter_speed_dial: ^7.0.0`** to `pubspec.yaml`.

---

### Sprint 1 Acceptance Criteria

- [x] `flutter_slidable`, `flutter_speed_dial`, `grouped_list` added to `pubspec.yaml`
- [x] Can swipe any item tile left/right to trigger quick stock adjustment
- [x] Bottom sheet opens pre-configured (correct direction, smart default)
- [x] Movement saved, list refreshes, snackbar shown — all without leaving inventory screen
- [x] Stock health bar visible on every tile with correct color coding
- [x] Category chips replace dropdown; single tap filters the list
- [x] Items grouped by category with sticky headers
- [x] Admin sees speed dial FAB; non-admin sees nothing or single record-movement FAB

---

### New packages for Sprint 1

```yaml
# pubspec.yaml additions
flutter_slidable: ^3.1.1      # swipe gestures on list tiles
flutter_speed_dial: ^7.0.0    # speed dial FAB
grouped_list: ^5.1.2          # grouped list with sticky headers
```

---

## Design Sprint — Professional UI (3 days)

**Goal:** Elevate the app from generic Material 3 defaults to a polished, professional product. Every screen the user sees should feel intentional — correct typography, purposeful color, clear visual hierarchy.

**Outcome:** The app looks like a product, not a prototype. Restaurant staff can read stock levels at a glance. Every new screen written in Sprint 1.5 and Sprint 2 starts life already styled correctly.

**No backend changes. No new features. Flutter/Dart only.**

**Package added:** `google_fonts: ^6.2.1`

---

### DS-1 · Design Tokens + Theme Overhaul
**File:** `mobile/lib/core/theme/app_theme.dart` — FULL REWRITE

Replace the minimal seed-color theme with explicit tokens for every surface, border, status color, and component style.

**Color tokens:**
```dart
// Brand
static const Color brand       = Color(0xFF1A56DB);
static const Color brandLight  = Color(0xFFEBF0FF);

// Semantic status (stock, sync)
static const Color success     = Color(0xFF059669);
static const Color successBg   = Color(0xFFECFDF5);
static const Color warning     = Color(0xFFD97706);
static const Color warningBg   = Color(0xFFFFFBEB);
static const Color danger      = Color(0xFFDC2626);
static const Color dangerBg    = Color(0xFFFEF2F2);

// Neutral
static const Color neutral     = Color(0xFF6B7280);

// Surfaces (light)
static const Color surface0    = Color(0xFFF9FAFB);  // page background
static const Color surface1    = Color(0xFFFFFFFF);  // cards, appbar, nav bar
static const Color border      = Color(0xFFE5E7EB);  // all dividers / card borders
```

**Typography:** `GoogleFonts.interTextTheme()` applied to the entire `ThemeData`. Inter replaces the system font everywhere with no per-widget work needed.

**Component themes to set explicitly:**
- `AppBarTheme`: white bg, 0 elevation, `scrolledUnderElevation: 1`, bottom border via `shape: Border(bottom: ...)`
- `CardTheme`: `elevation: 0`, white bg, 1px border (`BorderSide(color: border)`), `borderRadius: 12`
- `NavigationBarTheme`: white bg, top border, `indicatorColor: brandLight`, Inter label style, height 68
- `InputDecorationTheme`: `surface0` fill, 10px radius, brand-colored focus border
- `ChipTheme`: `surface0` bg, `brandLight` selected, 8px radius
- `FilledButtonTheme`: brand blue, Inter 15sp 600, 10px radius, 14px vertical padding
- `SnackBarTheme`: dark bg (`#1F2937`), floating, 10px radius
- `DividerTheme`: `border` color, thickness 1

---

### DS-2 · Shared: StatusBadge Widget
**File:** `mobile/lib/widgets/status_badge.dart` — NEW

Pill-shaped colored label used everywhere a status needs to be communicated inline (stock level, sync state, order status).

```dart
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;    // text color
  final Color bgColor;  // background

  // Build: Container with borderRadius 100, padding H:8 V:3
  // Text: 11sp, FontWeight.w600
}

// Convenience constructors:
StatusBadge.lowStock()    // warningColor on warningBg
StatusBadge.outOfStock()  // dangerColor on dangerBg
StatusBadge.pending()     // neutral on surface0
StatusBadge.synced()      // successColor on successBg
```

---

### DS-3 · Shared: SectionHeader Widget
**File:** `mobile/lib/widgets/section_header.dart` — NEW

Consistent section label used on Dashboard, grouped inventory list headers, and Orders.

```dart
class SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;    // e.g. "See all"
  final VoidCallback? onAction;
  final Color? accentColor;     // left border color, defaults to brand

  // Build: Row with 3px left ColoredBox border + 12px gap + uppercase title text
  // title: 11sp, FontWeight.w600, letterSpacing 0.8, neutral color
  // action: 13sp, brand color, right-aligned
}
```

Used by `GroupedItemsScreen` category headers (Sprint 1), `DashboardScreen` section labels, `OrdersScreen`.

---

### DS-4 · MetricCard Redesign
**File:** `mobile/lib/features/dashboard/widgets/metric_card.dart` — REWRITE

Replace the plain icon + number layout with a card that has visual weight.

```
┌──────────────────────────────────┐  1px border, white bg, 12px radius
│  ┌────┐                          │
│  │ ⚠  │  LOW STOCK               │  40×40 tinted icon container (10px radius)
│  └────┘                          │  label: 11sp 600 uppercase neutral, above value
│                                  │
│  8                               │  value: 32sp 700 — the number IS the card
│  items need restocking           │  subtitle: 12sp neutral
└──────────────────────────────────┘
```

Parameters: `title`, `value`, `subtitle` (optional descriptive line), `icon`, `color`, `bgColor` (defaults to `color.withOpacity(0.12)`).

No elevation. Flat with 1px border matches the new card theme.

---

### DS-5 · ItemTile Visual Polish
**File:** `mobile/lib/features/inventory/widgets/item_tile.dart`

Sprint 1 adds swipe + StockHealthBar to this file. The design sprint adds visual polish **on top of** those Sprint 1 changes — do not regress swipe functionality.

Changes:
- Replace `Card > ListTile` with `Card > Padding > Column + Row` for full layout control
- Stock amount moved to trailing **top row**, bold, colored by `AppTheme.stockStatusColor`
- Unit shown inline: `"12 kg"` not `"12"` + `" kg"` separately
- `StatusBadge.lowStock()` / `StatusBadge.outOfStock()` shown conditionally below the health bar
- Category avatar: bump opacity from 15% → 20% for readability
- Remove inner `ListTile` widget — use plain `Row` + `Column` with explicit padding `EdgeInsets.all(12)`

---

### DS-6 · Login Screen Redesign
**File:** `mobile/lib/features/auth/login_screen.dart` — REWRITE

Two-zone layout: branded gradient hero top half, white form sheet bottom half.

```
┌────────────────────────────────┐
│     [gradient: brand blue]     │  LinearGradient: 0xFF1A56DB → 0xFF2563EB
│                                │
│        ┌──────────┐            │
│        │  [icon]  │            │  white rounded square 80×80, brand icon inside
│        └──────────┘            │
│      KJ Inventory              │  white, 28sp 700
│   Restaurant management        │  white 70%, 14sp
│                                │
├────────────────────────────────┤  white sheet, borderRadius topLeft/topRight 28
│  Welcome back           (24sp) │
│  Sign in to continue    (14sp) │
│                                │
│  [Email field          ]       │
│  [Password field      👁]      │
│                                │
│  [      Sign In        ]       │  brand FilledButton, full width
└────────────────────────────────┘
```

Implementation: `Stack` or `Column` with `Expanded` hero + `Container` with `BoxDecoration(borderRadius: BorderRadius.vertical(top: Radius.circular(28)), color: white)` for the form sheet.

---

### DS-7 · AppScaffold Polish
**File:** `mobile/lib/widgets/app_scaffold.dart`

- Replace manual `Stack` badge on notifications bell with Flutter M3 `Badge` widget: `Badge(label: Text('$unreadCount'), child: Icon(Icons.notifications_outlined))`
- AppBar title style: `titleMedium` weight (Inter 600 16sp) — current default is too large
- `NavigationBar` already themed via DS-1; no structural changes needed

---

### DS-8 · Dashboard Screen Refresh
**File:** `mobile/lib/features/dashboard/dashboard_screen.dart`

- Replace `Text('Low Stock Items', style: titleMedium)` with `SectionHeader(title: 'LOW STOCK ITEMS', accentColor: AppTheme.warning)`
- Replace `Text('Recent Alerts', ...)` with `SectionHeader(title: 'RECENT ALERTS', accentColor: AppTheme.danger)`
- Replace `Text('Stock Movements ...')` with `SectionHeader(title: 'STOCK MOVEMENTS (7 DAYS)')`
- Replace `Text('Items by Category')` with `SectionHeader(title: 'BY CATEGORY')`
- Alert list items: replace `Card > ListTile` with a left-border colored row (3px colored left border using `DecoratedBox`, not a full card per alert)
- Low stock list: use the polished `ItemTile` (DS-5 version)
- Metric cards: switch to 2-column `GridView.count` (crossAxisCount: 2, childAspectRatio: 1.25) for consistent sizing

---

### DS-9 · Orders Screen Polish
**File:** `mobile/lib/features/orders/orders_screen.dart`

Replace `CircleAvatar` letter with a proper platform badge and add order status chip.

**New order tile layout:**
```
┌────────────────────────────────────────┐
│  [Swiggy]  #ORD-8821          ₹1,240  │  platform pill (orange/red bg)
│            Rahul Kumar • 3 items       │  amount: titleMedium bold
│            Today, 2:45 PM  [Delivered] │  status StatusBadge
└────────────────────────────────────────┘
```

- Platform badge: small pill `Container` with text — `"Swiggy"` on `Colors.orange.shade100`, `"Zomato"` on `Colors.red.shade100`
- Status: `StatusBadge` (green=Delivered, amber=Pending, red=Cancelled)
- Date: formatted with `intl` — `"Today, 2:45 PM"` / `"Yesterday"` / `"12 Mar"`
- Remove `Card` wrapper — use `Ink + InkWell` with a bottom `Divider` for a tighter list

---

### Design Sprint Acceptance Criteria

**Theme:**
- [ ] Inter font renders on all text — no system fallback visible
- [ ] Page background is `#F9FAFB`, cards are white with 1px border (no card shadows)
- [ ] AppBar is white with 1px bottom border — not blue, not elevated
- [ ] NavigationBar has 1px top border, brand-tinted selected indicator

**Components:**
- [ ] `StatusBadge` renders correctly for all states (lowStock, outOfStock, pending, synced)
- [ ] `SectionHeader` shows accent border, uppercase label, optional action link

**Screens:**
- [ ] Login: gradient hero visible, form sheet white with top rounded corners
- [ ] Dashboard: SectionHeaders replace plain Text labels; metric cards use new layout
- [ ] Inventory item tiles: stock amount in trailing, status badge shown, category color at 20% opacity
- [ ] Orders: platform pill + status badge + formatted date on every order row
- [ ] AppScaffold: M3 `Badge` widget on notifications bell

---

### Design Sprint — New / Modified Files

**New:**
- [ ] `mobile/lib/widgets/status_badge.dart`
- [ ] `mobile/lib/widgets/section_header.dart`

**Modified:**
- [ ] `mobile/pubspec.yaml` — add `google_fonts: ^6.2.1`
- [ ] `mobile/lib/core/theme/app_theme.dart` — full rewrite
- [ ] `mobile/lib/features/dashboard/widgets/metric_card.dart` — rewrite
- [ ] `mobile/lib/features/inventory/widgets/item_tile.dart` — visual polish (on top of Sprint 1 swipe changes)
- [ ] `mobile/lib/features/auth/login_screen.dart` — rewrite
- [ ] `mobile/lib/widgets/app_scaffold.dart` — Badge widget, title style
- [ ] `mobile/lib/features/dashboard/dashboard_screen.dart` — SectionHeaders, alert rows, GridView metrics
- [ ] `mobile/lib/features/orders/orders_screen.dart` — platform pill, status badge, date format

---

## Sprint 1.5 — Complete Offline Support (1.5 weeks)

**Goal:** The app works fully without internet. Every screen shows data from a local cache. Mutations made offline are queued and synced automatically when connectivity returns.

**Outcome:** A user can open the app in airplane mode, browse inventory, record a stock movement, and see everything sync silently when they go back online. No spinner of death, no empty screens, no error toasts for network failures.

**No backend changes required.** Flutter only.

---

### S1.5-0 · Core Infrastructure: Local Database

**File:** `mobile/lib/core/local_db/local_database.dart`

Singleton `sqflite` database. Opens `kj_inventory.db` in the app documents directory. Handles schema creation and migrations via `onUpgrade`.

```dart
class LocalDatabase {
  static LocalDatabase? _instance;
  static Database? _db;

  static Future<LocalDatabase> getInstance() async { ... }
  Future<Database> get database async { ... }
  Future<void> _onCreate(Database db, int version) async { ... }
}
```

**Schema version 1** creates all tables in one pass (see individual table specs below).

---

### S1.5-1 · Cache Tables

**File:** `mobile/lib/core/local_db/schema.dart`

All tables share a `cached_at` column (ISO 8601 string) so the app can show a "last synced X ago" label.

#### `cached_items`
```sql
CREATE TABLE cached_items (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT NOT NULL,
  category_id       TEXT NOT NULL,
  name              TEXT NOT NULL,
  sku               TEXT,
  unit              TEXT NOT NULL,
  minimum_threshold REAL NOT NULL,
  current_stock     REAL NOT NULL,
  unit_cost         REAL,
  is_active         INTEGER NOT NULL DEFAULT 1,
  track_stock       INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  cached_at         TEXT NOT NULL
);
```

#### `cached_categories`
```sql
CREATE TABLE cached_categories (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
```

#### `cached_orders`
```sql
CREATE TABLE cached_orders (
  id                TEXT PRIMARY KEY,
  platform          TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  order_date        TEXT NOT NULL,
  customer_name     TEXT,
  total_amount      REAL NOT NULL,
  status            TEXT NOT NULL,
  items_json        TEXT,
  created_at        TEXT NOT NULL,
  cached_at         TEXT NOT NULL
);
```

#### `cached_movements`
```sql
CREATE TABLE cached_movements (
  id              TEXT PRIMARY KEY,
  item_id         TEXT NOT NULL,
  movement_type   TEXT NOT NULL,
  quantity        REAL NOT NULL,
  previous_stock  REAL NOT NULL,
  new_stock       REAL NOT NULL,
  reference       TEXT,
  notes           TEXT,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
```

#### `cached_dashboard`
```sql
-- Single-row table; upsert on every sync
CREATE TABLE cached_dashboard (
  id                   TEXT PRIMARY KEY DEFAULT 'singleton',
  total_items          INTEGER NOT NULL,
  low_stock_count      INTEGER NOT NULL,
  out_of_stock_count   INTEGER NOT NULL,
  total_value          REAL NOT NULL,
  recent_movements_json TEXT,
  stock_trends_json    TEXT,
  category_breakdown_json TEXT,
  cached_at            TEXT NOT NULL
);
```

#### `pending_mutations`
The offline write queue. Every mutation (stock movement, item update) that is attempted while offline (or fails due to network) is stored here.

```sql
CREATE TABLE pending_mutations (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,   -- 'create_movement' | 'update_item' | 'create_item' | 'delete_item'
  payload     TEXT NOT NULL,   -- JSON-encoded request body
  created_at  TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT
);
```

---

### S1.5-2 · Connectivity Provider

**File:** `mobile/lib/providers/connectivity_provider.dart`

```dart
// Emits true when online, false when offline
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity()
      .onConnectivityChanged
      .map((result) => result != ConnectivityResult.none);
});

// Convenience: current status (non-stream)
final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectivityProvider).valueOrNull ?? true;
});
```

Used by: every repository, the sync service, and the offline banner widget.

---

### S1.5-3 · Cache Repository Layer

**File:** `mobile/lib/core/local_db/cache_repository.dart`

Generic read/write helpers for the local DB. Each feature repository uses this.

```dart
class CacheRepository {
  final LocalDatabase _db;

  // Items
  Future<void> cacheItems(List<Item> items) async { ... }
  Future<List<Item>> getCachedItems({String? categoryId, String? search, bool? lowStock}) async { ... }
  Future<void> cacheItem(Item item) async { ... }
  Future<Item?> getCachedItem(String id) async { ... }
  Future<void> updateCachedItemStock(String id, double newStock) async { ... }

  // Categories
  Future<void> cacheCategories(List<Category> categories) async { ... }
  Future<List<Category>> getCachedCategories() async { ... }

  // Orders
  Future<void> cacheOrders(List<ExternalOrder> orders) async { ... }
  Future<List<ExternalOrder>> getCachedOrders({String? platform}) async { ... }

  // Movements
  Future<void> cacheMovements(List<StockMovement> movements, {String? itemId}) async { ... }
  Future<List<StockMovement>> getCachedMovements({String? itemId, int limit = 50}) async { ... }

  // Dashboard
  Future<void> cacheDashboard(DashboardMetrics metrics, List<StockTrend> trends, List<CategoryBreakdown> breakdown) async { ... }
  Future<({DashboardMetrics? metrics, DateTime? cachedAt})> getCachedDashboard() async { ... }

  // Cache age helpers
  Future<DateTime?> getLastCachedAt(String table) async { ... }
}
```

---

### S1.5-4 · Pending Mutations Queue

**File:** `mobile/lib/core/sync/mutation_queue.dart`

```dart
enum MutationType { createMovement, updateItem, createItem, deleteItem }

class PendingMutation {
  final String id;
  final MutationType type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final int retryCount;
  final String? lastError;
}

class MutationQueue {
  Future<void> enqueue(MutationType type, Map<String, dynamic> payload) async { ... }
  Future<List<PendingMutation>> getPending() async { ... }
  Future<void> markDone(String id) async { ... }
  Future<void> markFailed(String id, String error) async { ... }
  Future<int> pendingCount() async { ... }
}
```

Provider: `mutationQueueProvider` — also exposes `pendingMutationCountProvider` (integer stream for the sync badge).

---

### S1.5-5 · Offline-Aware Repository Wrappers

Modify each existing repository to follow the **cache-then-network** pattern:

**Pattern:**
```
1. Return cached data immediately (never show empty screen while loading)
2. Attempt network fetch in background
3. On success → update cache → notify provider to refresh
4. On failure (offline) → log, skip silently (cached data stays)
5. For writes → if offline, enqueue in MutationQueue; if online, execute directly + update cache
```

#### Modified: `mobile/lib/repositories/inventory_repository.dart`

Add `CacheRepository` dependency. Change `getItems()` and `getCategories()` to:
- Return cached data immediately
- Kick off a network fetch; on success, update cache and return fresh data
- Writes (`createItem`, `updateItem`, `deleteItem`) check connectivity first; if offline, enqueue to `MutationQueue` and optimistically update cache

#### Modified: `mobile/lib/repositories/movement_repository.dart`

`createMovement()`:
- If online → POST to API → cache result → update parent item's cached stock
- If offline → enqueue `MutationType.createMovement` → optimistically update `cached_items` stock → return a locally-created movement with a temp UUID

`getMovements()`:
- Return cached movements immediately
- Background-refresh from API when online

#### Modified: `mobile/lib/repositories/dashboard_repository.dart`

Return cached dashboard + trends + breakdown immediately, refresh in background.

#### Modified: `mobile/lib/repositories/order_repository.dart`

Return cached orders immediately, refresh in background. Orders are read-only so no mutation queue needed.

---

### S1.5-6 · Background Sync Service

**File:** `mobile/lib/core/sync/sync_service.dart`

Orchestrates all cache refreshes and mutation queue flushing.

```dart
class SyncService {
  // Called by connectivity listener, foreground listener, and 5-min timer
  Future<void> sync() async {
    if (!await _isOnline()) return;
    await _flushMutationQueue();
    await _refreshAllCaches();
  }

  Future<void> _flushMutationQueue() async {
    final pending = await _queue.getPending();
    for (final mutation in pending) {
      try {
        await _applyMutation(mutation);
        await _queue.markDone(mutation.id);
      } catch (e) {
        await _queue.markFailed(mutation.id, e.toString());
      }
    }
  }

  Future<void> _refreshAllCaches() async {
    // Run in parallel; failures are swallowed (partial refresh is fine)
    await Future.wait([
      _refreshInventory(),
      _refreshCategories(),
      _refreshDashboard(),
      _refreshOrders(),
    ], eagerError: false);
  }
}
```

**Trigger setup** (in `main.dart` or `AppScaffold`):
```dart
// 1. Connectivity change
ref.listen(connectivityProvider, (_, isOnline) {
  if (isOnline == true) ref.read(syncServiceProvider).sync();
});

// 2. App lifecycle foreground
AppLifecycleListener(onResume: () => ref.read(syncServiceProvider).sync());

// 3. Periodic timer (5 minutes)
Timer.periodic(const Duration(minutes: 5), (_) => ref.read(syncServiceProvider).sync());
```

Provider: `syncServiceProvider`.

---

### S1.5-7 · Offline Banner Widget

**File:** `mobile/lib/widgets/offline_banner.dart`

Slim animated banner shown at the top of every screen when offline.

```
 [!]  No internet connection — showing cached data
```

- Appears/disappears with `AnimatedContainer` (height transition, ~200ms)
- Amber background, `Icons.cloud_off` icon
- If pending mutations > 0: `"X change(s) will sync when connected"`
- Wires to `isOnlineProvider` + `pendingMutationCountProvider`

Integrate into `AppScaffold` above the body content (below AppBar).

---

### S1.5-8 · Last-Synced Timestamp Display

**File:** `mobile/lib/widgets/last_synced_label.dart`

Small grey label: `"Last synced 3 min ago"` or `"Last synced today at 10:45 AM"`.

Used on:
- Dashboard screen (below the metrics row)
- Items screen (below the search bar)
- Orders screen (below the stats card)

Reads `CacheRepository.getLastCachedAt(table)` via a `FutureProvider`.

---

### S1.5-9 · Sync Status Provider

**File:** `mobile/lib/providers/sync_provider.dart`

```dart
// Is a sync currently running?
final isSyncingProvider = StateProvider<bool>((ref) => false);

// How many mutations are pending?
final pendingMutationCountProvider = FutureProvider<int>((ref) {
  return ref.read(mutationQueueProvider).pendingCount();
});

// When was each data set last cached?
final lastSyncedAtProvider = FutureProvider.family<DateTime?, String>((ref, table) {
  return ref.read(cacheRepositoryProvider).getLastCachedAt(table);
});
```

A spinning icon appears in the AppBar when `isSyncingProvider` is true.

---

### S1.5-10 · Offline-Tolerant Auth Startup

**File:** `mobile/lib/providers/auth_provider.dart` — MODIFY
**File:** `mobile/lib/core/local_db/schema.dart` — ADD `cached_user` table

**Why:** Login itself cannot work offline (requires backend to verify credentials and issue JWT). However, a user who was previously logged in should not be locked out just because they open the app without internet. The fix is to cache the user profile locally after a successful login/startup, and use that cached profile when the API is unreachable at startup.

**Cached user table:**
```sql
CREATE TABLE cached_user (
  id              TEXT PRIMARY KEY DEFAULT 'current',
  user_json       TEXT NOT NULL,   -- full User model as JSON
  cached_at       TEXT NOT NULL
);
```

**Modified startup flow in `authProvider`:**

```
Before (broken offline):
  1. Read JWT from secure_storage
  2. Call GET /auth/profile → if fails (offline) → clear token → show login → login fails → stuck

After (offline-tolerant):
  1. Read JWT from secure_storage
  2. If no JWT → show login (no workaround; user must be online to first login)
  3. If JWT exists:
     a. Try GET /auth/profile (connectTimeout: 5s)
     b. Success → update cached_user → proceed to app
     c. Offline/timeout → load cached_user from SQLite → proceed to app (with offline banner)
     d. 401 Unauthorized → clear JWT + cached_user → show login
```

**On logout:** clear both `flutter_secure_storage` token AND `cached_user` row.

**Note:** If the JWT expires while the user is offline, they won't know until they come back online and the next sync attempt receives a 401, which triggers logout. This is acceptable — decoding JWT expiry client-side adds complexity not worth it for this app.

---

### Sprint 1.5 Acceptance Criteria

**Auth / startup:**
- [ ] Previously-logged-in user opens app offline → lands on Dashboard with cached data (no login screen)
- [ ] First-time login requires internet (expected — not a bug)
- [ ] JWT expiry while offline → silent until next online sync → then redirected to login

**Offline browsing:**
- [ ] Open app in airplane mode — every screen shows last-cached data, no error dialogs
- [ ] Items list loads from cache instantly (< 100ms)
- [ ] Dashboard shows cached metrics with "Last synced X ago" label
- [ ] Orders list loads from cache

**Offline writes:**
- [ ] Record a stock movement with no internet — optimistic update shown immediately
- [ ] Pending movement appears in the list with a `[pending sync]` badge
- [ ] Badge disappears after successful sync

**Auto-sync:**
- [ ] Going online triggers sync within 2 seconds
- [ ] App resuming from background triggers sync
- [ ] Sync runs every 5 minutes while online
- [ ] After sync, lists refresh with fresh data without user action

**UI/UX:**
- [ ] Offline banner appears at top of screen when offline
- [ ] Banner shows count of unsynced changes
- [ ] Spinner in AppBar during active sync
- [ ] "Last synced X ago" label visible on main screens
- [ ] No crash or blank screen when opening any screen offline

---

### New Packages for Sprint 1.5

```yaml
# pubspec.yaml additions
sqflite: ^2.4.2            # local SQLite (shared with Sprint 2)
path_provider: ^2.1.5      # app documents directory (shared with Sprint 2)
connectivity_plus: ^6.1.4  # network status stream (shared with Sprint 2)
```

> Sprint 2 already planned these same packages — no duplication; Sprint 1.5 installs them first and Sprint 2 adds its expense tables to the same DB.

---

### Sprint 1.5 — New / Modified Files

**New:**
- [ ] `mobile/lib/core/local_db/local_database.dart` — DB singleton + schema
- [ ] `mobile/lib/core/local_db/schema.dart` — table DDL constants
- [ ] `mobile/lib/core/local_db/cache_repository.dart` — read/write helpers
- [ ] `mobile/lib/core/sync/mutation_queue.dart` — offline write queue
- [ ] `mobile/lib/core/sync/sync_service.dart` — orchestrated sync
- [ ] `mobile/lib/providers/connectivity_provider.dart` — online/offline stream
- [ ] `mobile/lib/providers/sync_provider.dart` — sync state + counters
- [ ] `mobile/lib/widgets/offline_banner.dart` — connectivity indicator
- [ ] `mobile/lib/widgets/last_synced_label.dart` — cache age display

**Modified:**
- [ ] `mobile/lib/repositories/inventory_repository.dart` — cache-then-network
- [ ] `mobile/lib/repositories/movement_repository.dart` — offline queue for writes
- [ ] `mobile/lib/repositories/dashboard_repository.dart` — cache-then-network
- [ ] `mobile/lib/repositories/order_repository.dart` — cache-then-network
- [ ] `mobile/lib/widgets/app_scaffold.dart` — offline banner + sync spinner
- [ ] `mobile/lib/main.dart` — sync triggers (lifecycle + timer)
- [ ] `mobile/pubspec.yaml` — add 3 packages

---

## Sprint 2 — Expense Tracker (2 weeks)

**Goal:** Track all business expenses by funding source and payment method. Works fully offline; syncs to server when connected.

**Outcome:** User can log an expense in under 10 seconds. View totals split by who funded them (personal, partner2, partner3, payout, loan).

---

### S2-1 · Backend: Expenses API + Migration
**Files:** Go backend

#### Migration
**File:** `backend/migrations/sqlite/000005_add_expenses.up.sql`

```sql
CREATE TABLE expenses (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  amount          REAL NOT NULL CHECK(amount > 0),
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,
  funding_source  TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  paid_by         TEXT,
  reference       TEXT,
  expense_date    DATETIME NOT NULL,
  tags            TEXT,
  notes           TEXT,
  created_by      TEXT NOT NULL REFERENCES users(id),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_org_date   ON expenses(organization_id, expense_date);
CREATE INDEX idx_expenses_funding    ON expenses(organization_id, funding_source);
CREATE INDEX idx_expenses_category   ON expenses(organization_id, category);
```

**File:** `backend/migrations/sqlite/000005_add_expenses.down.sql`

```sql
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_funding;
DROP INDEX IF EXISTS idx_expenses_org_date;
DROP TABLE IF EXISTS expenses;
```

#### Domain Model
**File:** `backend/internal/domain/expense.go`

Fields: `ID`, `OrganizationID`, `Amount`, `Description`, `Category`, `FundingSource`, `PaymentMethod`, `PaidBy`, `Reference`, `ExpenseDate`, `Tags`, `Notes`, `CreatedBy`, `CreatedAt`, `UpdatedAt`

#### Repository
**File:** `backend/internal/repository/expense_repository.go`

Methods: `Create`, `GetByID`, `List` (filter by org, date range, funding source, category), `GetStats` (totals by funding source + category for a period)

#### Handlers
**File:** `backend/internal/handlers/expense_handler.go`

```
POST   /api/v1/expenses           → create expense
GET    /api/v1/expenses           → list (query: startDate, endDate, fundingSource, category, limit, offset)
GET    /api/v1/expenses/:id       → get single
PUT    /api/v1/expenses/:id       → update
DELETE /api/v1/expenses/:id       → delete (ADMIN only)
GET    /api/v1/expenses/stats     → totals by source and category for period
```

Register routes in `backend/cmd/server/main.go`.

---

### S2-2 · Local SQLite Database (Flutter)
**Files:** `mobile/lib/core/local_db/`

Add packages:
```yaml
sqflite: ^2.4.2
path_provider: ^2.1.5
connectivity_plus: ^6.1.4
shared_preferences: ^2.3.5
```

**File:** `mobile/lib/core/local_db/local_database.dart`

Singleton SQLite database using `sqflite`. Opens `kj_inventory.db` in app documents directory.

**File:** `mobile/lib/core/local_db/expense_table.dart`

```sql
CREATE TABLE local_expenses (
  id              TEXT PRIMARY KEY,
  amount          REAL NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL,
  funding_source  TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  paid_by         TEXT,
  reference       TEXT,
  expense_date    TEXT NOT NULL,
  tags            TEXT,
  notes           TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'pending',
  local_created_at TEXT NOT NULL,
  server_created_at TEXT
)
```

`sync_status`: `pending | synced | failed`

---

### S2-3 · Expense Freezed Model
**File:** `mobile/lib/models/expense.dart`

```dart
@freezed
class Expense with _$Expense {
  const factory Expense({
    required String id,
    required double amount,
    required String description,
    required ExpenseCategory category,
    required FundingSource fundingSource,
    required PaymentMethod paymentMethod,
    String? paidBy,
    String? reference,
    required DateTime expenseDate,
    @Default([]) List<String> tags,
    String? notes,
    @Default(SyncStatus.pending) SyncStatus syncStatus,
    required DateTime localCreatedAt,
    DateTime? serverCreatedAt,
  }) = _Expense;

  factory Expense.fromJson(Map<String, dynamic> json) => _$ExpenseFromJson(json);
}

enum FundingSource { personal, partner2, partner3, payout, loan }
enum PaymentMethod { upi, creditCard, cash, neft, other }
enum SyncStatus    { pending, synced, failed }

enum ExpenseCategory {
  rawMaterial,
  packaging,
  utilities,
  staffWages,
  equipment,
  marketing,
  delivery,
  rent,
  other,
}
```

Run `dart run build_runner build` after adding.

---

### S2-4 · Expense Local Repository
**File:** `mobile/lib/repositories/expense_local_repository.dart`

Reads/writes to local SQLite only. All operations are synchronous from the UI perspective (SQLite is fast).

Methods:
- `Future<List<Expense>> getAll({FundingSource? source, ExpenseCategory? cat, DateTime? from, DateTime? to})`
- `Future<Expense> insert(Expense expense)`
- `Future<void> update(Expense expense)`
- `Future<void> delete(String id)`
- `Future<List<Expense>> getPending()` — for sync queue
- `Future<void> markSynced(String id, DateTime serverCreatedAt)`
- `Future<void> markFailed(String id)`
- `Future<Map<FundingSource, double>> getTotalsBySource({DateTime? from, DateTime? to})`

---

### S2-5 · Expense Remote Repository
**File:** `mobile/lib/repositories/expense_repository.dart`

Thin Dio wrapper for the backend API. Used only by the sync service.

Methods:
- `Future<String> createExpense(Expense expense)` → returns server ID
- `Future<List<Expense>> fetchExpenses({DateTime? from, DateTime? to})`
- `Future<ExpenseStats> getStats({required DateTime from, required DateTime to})`

---

### S2-6 · Sync Service
**File:** `mobile/lib/core/sync/expense_sync_service.dart`

Flushes pending local expenses to the backend. Called:
- On app foreground (via `AppLifecycleListener`)
- When connectivity changes to online (via `connectivity_plus`)
- Every 60 seconds while online (periodic timer)

```dart
class ExpenseSyncService {
  Future<void> syncPending() async {
    if (!await _isOnline()) return;
    final pending = await _localRepo.getPending();
    for (final expense in pending) {
      try {
        final serverId = await _remoteRepo.createExpense(expense);
        await _localRepo.markSynced(expense.id, DateTime.now());
      } catch (_) {
        await _localRepo.markFailed(expense.id);
      }
    }
  }
}
```

Provide via Riverpod: `expenseSyncServiceProvider`.

---

### S2-7 · Expense Riverpod Provider
**File:** `mobile/lib/providers/expense_provider.dart`

```dart
// State
class ExpenseState {
  final List<Expense> expenses;
  final bool isLoading;
  final String? error;
  final FundingSource? sourceFilter;
  final ExpenseCategory? categoryFilter;
  final DateTime? fromDate;
  final DateTime? toDate;
}

// Provider (AsyncNotifier)
class ExpenseNotifier extends AsyncNotifier<ExpenseState> {
  Future<void> addExpense(Expense expense);
  Future<void> deleteExpense(String id);
  void setSourceFilter(FundingSource? source);
  void setCategoryFilter(ExpenseCategory? cat);
  void setDateRange(DateTime from, DateTime to);
  void clearFilters();
}
```

Also expose:
- `expenseTotalsProvider` — `Map<FundingSource, double>` for current period
- `lastUsedDefaultsProvider` — reads `SharedPreferences` for last payment method + funding source

---

### S2-8 · Add Expense Screen (Quick-Add)
**File:** `mobile/lib/features/expenses/add_expense_screen.dart`

Opens as a bottom sheet (`showModalBottomSheet` with `isScrollControlled: true`) for fast entry, OR as a full screen from the tab.

**UI flow (minimal path = 3 interactions):**

```
┌────────────────────────────────────┐
│  Add Expense                  [✕]  │
├────────────────────────────────────┤
│                                    │
│   ₹ [________________]            │  ← auto-focused, numpad
│                                    │
│   [Raw Mat.][Pack.][Util.][Wages]  │  ← ExpenseCategory chips (most-used first)
│   [Equip.][Market.][Delivery][+]   │
│                                    │
│   Paid from                        │
│   [Personal][P2][P3][Payout][Loan] │  ← FundingSource chips
│                                    │
│   Via                              │
│   [UPI ★][Card][Cash][NEFT]       │  ← PaymentMethod chips; ★ = last used
│                                    │
│   What for? _____________________  │  ← description text field
│                                    │
│   [+ More details]                 │  ← expands: date, reference, notes, tags
│                                    │
│   [       ADD EXPENSE      ]       │
└────────────────────────────────────┘
```

**On submit:**
1. Generate UUID locally
2. Save to local SQLite via `ExpenseLocalRepository` (instant)
3. Invalidate `expenseProvider` (list refreshes immediately)
4. Pop sheet + show snackbar: "Expense saved"
5. Trigger sync in background (non-blocking)
6. Save last-used payment method + funding source to `SharedPreferences`

---

### S2-9 · Expenses List Screen
**File:** `mobile/lib/features/expenses/expenses_screen.dart`

```
┌────────────────────────────────────┐
│  Expenses                  [+ Add] │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  This month: ₹12,450        │  │  ← ExpenseSummaryCard
│  │  Personal ₹4k · P2 ₹3k     │  │
│  │  [This week ▼]              │  │  ← period picker
│  └──────────────────────────────┘  │
├────────────────────────────────────┤
│  [All][Personal][P2][P3][Payout]   │  ← FundingSource filter chips
├────────────────────────────────────┤
│  TODAY                             │
│  ┌──────────────────────────────┐  │
│  │ Vegetables         ₹800     │  │
│  │ Raw Material · UPI · P2     │  │
│  │ 10:30 AM         [⏳ sync]  │  │  ← pending badge
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Expense tile colors by funding source:**
- Personal → Blue
- Partner2 → Purple
- Partner3 → Orange
- Payout → Green
- Loan → Red

**Sync status badge:**
- `pending` → hourglass icon, muted
- `failed` → warning icon, red, tap to retry
- `synced` → no badge (clean)

---

### S2-10 · Navigation — Add Expenses Tab
**File:** `mobile/lib/widgets/app_scaffold.dart` + `mobile/lib/app.dart`

Add 5th bottom nav destination: **Expenses** (`Icons.receipt_outlined` / `Icons.receipt`).

Update `_currentIndex` to handle `/expenses` route.

Add routes to GoRouter:
```dart
'/expenses'        → ExpensesScreen
'/expenses/add'    → AddExpenseScreen (full-screen mode)
'/expenses/:id'    → ExpenseDetailScreen
```

Update `_titles` array in `AppScaffold`.

---

### S2-11 · Offline Indicator
**File:** `mobile/lib/widgets/offline_banner.dart`

Small amber banner at the top of the app when offline:
```
 ⚠  Offline — expenses saved locally, will sync when connected
```

Subscribe to `connectivity_plus` stream in a provider. Show banner using `AnimatedContainer` in `AppScaffold`.

---

### Sprint 2 Acceptance Criteria

**Offline-first:**
- [ ] Can add expense with no network — saved instantly, shown in list
- [ ] `[⏳ sync]` badge shows on pending items
- [ ] When network returns, pending expenses sync automatically
- [ ] `[sync]` badge disappears after successful sync

**Quick-add UX:**
- [ ] Expense entry completes in ≤ 3 taps (amount → category → Add)
- [ ] Last-used payment method and funding source pre-selected on next open
- [ ] "More details" section collapses by default

**Data:**
- [ ] Totals card shows correct breakdown by funding source
- [ ] Filter by funding source works
- [ ] Period picker (this week / this month / custom) works

**Backend:**
- [ ] `POST /api/v1/expenses` creates expense
- [ ] `GET /api/v1/expenses/stats` returns totals by source + category
- [ ] Migration runs cleanly on both SQLite and PostgreSQL

---

## Dependencies Between Sprints

**Sprint 1 → Design Sprint:** Design sprint rewrites `item_tile.dart` and `app_scaffold.dart`. Sprint 1 must be complete so the design sprint adds polish on top of — not instead of — Sprint 1's swipe/bar integration.

**Design Sprint → Sprint 1.5:** Sprint 1.5 adds `offline_banner.dart` and modifies `app_scaffold.dart`. The design sprint polishes the scaffold first so Sprint 1.5 slots the banner into an already-styled shell.

**Sprint 1.5 → Sprint 2:** Sprint 2 reuses the `local_database.dart` singleton and `sqflite`/`path_provider`/`connectivity_plus` packages installed in Sprint 1.5. The `expense_table.dart` in Sprint 2 calls `LocalDatabase.getInstance()` and adds its tables in the same DB. The offline infrastructure (connectivity provider, sync service pattern) is extended rather than rewritten. Expense tiles use `StatusBadge` from the design sprint.

**Execution order:** Sprint 1 → Design Sprint → Sprint 1.5 → Sprint 2.

---

## New Packages Summary

### Sprint 1
```yaml
flutter_slidable: ^3.1.1
flutter_speed_dial: ^7.0.0
grouped_list: ^5.1.2
```

### Design Sprint
```yaml
google_fonts: ^6.2.1
```

### Sprint 1.5
```yaml
sqflite: ^2.4.2            # local SQLite for all cached data
path_provider: ^2.1.5      # documents directory
connectivity_plus: ^6.1.4  # network status stream
```

### Sprint 2
```yaml
shared_preferences: ^2.3.5   # persist last-used payment defaults
# sqflite, path_provider, connectivity_plus already added in Sprint 1.5
```

---

## File Checklist

### Sprint 1 — New / Modified Files (Flutter only)
- [x] `mobile/lib/features/inventory/widgets/stock_health_bar.dart` — DONE
- [x] `mobile/lib/features/inventory/widgets/category_chip_bar.dart` — DONE
- [x] `mobile/lib/features/inventory/widgets/quick_adjust_sheet.dart` — DONE
- [ ] `mobile/lib/features/inventory/widgets/item_tile.dart` — MODIFY (add Slidable swipe + StockHealthBar)
- [ ] `mobile/lib/features/inventory/items_screen.dart` — MODIFY (CategoryChipBar + grouped_list)
- [ ] `mobile/lib/providers/inventory_provider.dart` — MODIFY (add `groupedItemsProvider`)
- [ ] `mobile/pubspec.yaml` — MODIFY (add flutter_slidable, flutter_speed_dial, grouped_list)

### Design Sprint — New / Modified Files
- [ ] `mobile/lib/widgets/status_badge.dart` — NEW
- [ ] `mobile/lib/widgets/section_header.dart` — NEW
- [ ] `mobile/pubspec.yaml` — MODIFY (add google_fonts)
- [ ] `mobile/lib/core/theme/app_theme.dart` — REWRITE
- [ ] `mobile/lib/features/dashboard/widgets/metric_card.dart` — REWRITE
- [ ] `mobile/lib/features/inventory/widgets/item_tile.dart` — MODIFY (visual polish on Sprint 1 changes)
- [ ] `mobile/lib/features/auth/login_screen.dart` — REWRITE (gradient hero)
- [ ] `mobile/lib/widgets/app_scaffold.dart` — MODIFY (M3 Badge, title style)
- [ ] `mobile/lib/features/dashboard/dashboard_screen.dart` — MODIFY (SectionHeaders, GridView)
- [ ] `mobile/lib/features/orders/orders_screen.dart` — MODIFY (platform pill, StatusBadge, date format)

### Sprint 1.5 — New / Modified Files (Flutter only)
- [ ] `mobile/lib/core/local_db/local_database.dart` — NEW
- [ ] `mobile/lib/core/local_db/schema.dart` — NEW
- [ ] `mobile/lib/core/local_db/cache_repository.dart` — NEW
- [ ] `mobile/lib/core/sync/mutation_queue.dart` — NEW
- [ ] `mobile/lib/core/sync/sync_service.dart` — NEW
- [ ] `mobile/lib/providers/connectivity_provider.dart` — NEW
- [ ] `mobile/lib/providers/sync_provider.dart` — NEW
- [ ] `mobile/lib/widgets/offline_banner.dart` — NEW
- [ ] `mobile/lib/widgets/last_synced_label.dart` — NEW
- [ ] `mobile/lib/providers/auth_provider.dart` — MODIFY (offline-tolerant startup)
- [ ] `mobile/lib/repositories/inventory_repository.dart` — MODIFY (cache-then-network)
- [ ] `mobile/lib/repositories/movement_repository.dart` — MODIFY (offline queue)
- [ ] `mobile/lib/repositories/dashboard_repository.dart` — MODIFY (cache-then-network)
- [ ] `mobile/lib/repositories/order_repository.dart` — MODIFY (cache-then-network)
- [ ] `mobile/lib/widgets/app_scaffold.dart` — MODIFY (offline banner + sync spinner)
- [ ] `mobile/lib/main.dart` — MODIFY (sync triggers)
- [ ] `mobile/pubspec.yaml` — MODIFY (add 3 packages)

### Sprint 2 — New Files
- [ ] `backend/migrations/sqlite/000005_add_expenses.up.sql`
- [ ] `backend/migrations/sqlite/000005_add_expenses.down.sql`
- [ ] `backend/internal/domain/expense.go`
- [ ] `backend/internal/repository/expense_repository.go`
- [ ] `backend/internal/handlers/expense_handler.go`
- [ ] `mobile/lib/core/local_db/expense_table.dart` — NEW (adds expense table to existing DB)
- [ ] `mobile/lib/core/sync/expense_sync_service.dart` — NEW (extends sync_service pattern)
- [ ] `mobile/lib/models/expense.dart`
- [ ] `mobile/lib/repositories/expense_local_repository.dart`
- [ ] `mobile/lib/repositories/expense_repository.dart`
- [ ] `mobile/lib/providers/expense_provider.dart`
- [ ] `mobile/lib/features/expenses/add_expense_screen.dart`
- [ ] `mobile/lib/features/expenses/expenses_screen.dart`
- [ ] `mobile/lib/features/expenses/expense_detail_screen.dart`
- [ ] `mobile/lib/features/expenses/widgets/expense_tile.dart`
- [ ] `mobile/lib/features/expenses/widgets/expense_summary_card.dart`
- [ ] `mobile/lib/widgets/app_scaffold.dart` — MODIFY (5th tab; offline_banner already added in S1.5)
- [ ] `mobile/lib/app.dart` — MODIFY (new routes)
- [ ] `mobile/pubspec.yaml` — MODIFY (add shared_preferences; sqflite/path_provider/connectivity_plus already added in S1.5)
