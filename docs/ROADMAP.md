# KJ Inventory - Development Roadmap

## Current Status (v0.1 - MVP Complete ✅)

### Backend
- ✅ SQLite database with migrations
- ✅ REST API with JWT authentication
- ✅ CRUD operations for Items, Categories, Movements
- ✅ Dashboard metrics and analytics
- ✅ Stock movement tracking with audit trail
- ✅ Role-based access (ADMIN, MANAGER, USER)
- ✅ Test coverage for handlers and repositories

### Frontend
- ✅ React + TypeScript + Tailwind CSS
- ✅ Authentication (Login/Register)
- ✅ Dashboard with real-time metrics
- ✅ Inventory management with search/filters
- ✅ Quick stock adjustments (IN/OUT/ADJUSTMENT)
- ✅ Mobile-responsive design
- ✅ React Query for data fetching and caching

---

## Phase 1: Core Enhancements (High Priority)

### 1.1 PostgreSQL Support
**Goal**: Enable production deployment with PostgreSQL

**Tasks**:
- [ ] Create PostgreSQL migrations in `backend/migrations/postgres/`
  - Convert SQLite-specific syntax (randomblob → uuid)
  - Change DATETIME → TIMESTAMPTZ
  - Rewrite triggers in plpgsql
- [ ] Implement dual-dialect repository pattern
  - Create `*_sqlite.go` and `*_postgres.go` files
  - Use build tags or runtime driver detection
- [ ] Update connection handling for Postgres pool settings
- [ ] Test with docker-compose Postgres service
- [ ] Update CI/CD to test both SQLite and Postgres

**Files to Create**:
```
backend/migrations/postgres/000001_initial_schema.up.sql
backend/migrations/postgres/000001_initial_schema.down.sql
backend/internal/repository/item_repo_postgres.go
backend/internal/repository/user_repo_postgres.go
backend/internal/repository/movement_repo_postgres.go
```

**Estimated Effort**: 2-3 days

---

### 1.2 Movements History Page
**Goal**: Dedicated view for all stock movements with advanced filtering

**Backend Tasks**:
- [x] Already implemented: `GET /api/v1/movements`
- [ ] Add filters: date range, movement type, user
- [ ] Add pagination with offset/limit
- [ ] Add sorting (by date, quantity, etc.)

**Frontend Tasks**:
- [ ] Create `MovementsPage.tsx`
- [ ] Add date range picker component
- [ ] Filter by movement type (IN/OUT/ADJUSTMENT)
- [ ] Show item details with thumbnails
- [ ] Export to CSV functionality
- [ ] Pagination controls

**Files to Create**:
```
frontend/src/pages/MovementsPage.tsx
frontend/src/components/movements/MovementFilters.tsx
frontend/src/components/movements/MovementList.tsx
```

**Estimated Effort**: 2 days

---

### 1.3 Categories Management UI
**Goal**: Allow users to create and manage categories with colors

**Backend Tasks**:
- [x] Already implemented: `GET /api/v1/categories`
- [x] Already implemented: `POST /api/v1/categories`
- [ ] Add `PUT /api/v1/categories/{id}` - Update category
- [ ] Add `DELETE /api/v1/categories/{id}` - Delete category (check for items)

**Frontend Tasks**:
- [ ] Create `CategoriesPage.tsx`
- [ ] Add Category modal (Create/Edit)
- [ ] Color picker for category colors
- [ ] Show item count per category
- [ ] Prevent deletion of categories with items
- [ ] Drag-and-drop reordering

**Files to Create**:
```
frontend/src/pages/CategoriesPage.tsx
frontend/src/components/categories/CategoryModal.tsx
frontend/src/components/categories/ColorPicker.tsx
```

**Estimated Effort**: 2 days

---

## Phase 2: User Experience (Medium Priority)

### 2.1 Advanced Dashboard
**Goal**: Rich analytics and visualizations

**Tasks**:
- [ ] Stock trends chart (Recharts line chart)
  - 7-day, 30-day, 90-day views
  - IN vs OUT movements over time
- [ ] Category breakdown (Recharts pie/donut chart)
  - Value by category
  - Item count by category
- [ ] Top movers widget (items with most activity)
- [ ] Velocity indicators (items moving fast vs slow)
- [ ] Value-based metrics (total inventory value)
- [ ] Low stock forecast (predict when items run out)

**Backend Tasks**:
- [x] Already implemented: `GET /api/v1/dashboard/stock-trends`
- [x] Already implemented: `GET /api/v1/dashboard/category-breakdown`
- [ ] Add endpoint: `GET /api/v1/dashboard/top-movers`
- [ ] Add endpoint: `GET /api/v1/dashboard/velocity`

**Frontend Tasks**:
- [ ] Install and integrate Recharts
- [ ] Create chart components
- [ ] Add date range selector
- [ ] Add export chart as image

**Estimated Effort**: 3-4 days

---

### 2.2 Bulk Operations
**Goal**: Handle large-scale inventory operations efficiently

**Tasks**:
- [ ] Bulk import items from CSV/Excel
  - Upload UI component
  - CSV parser with validation
  - Preview before import
  - Error reporting
- [ ] Bulk stock adjustment
  - Multi-select items
  - Apply same adjustment to multiple items
  - Batch API endpoint
- [ ] Bulk delete/archive items
- [ ] Bulk category assignment

**Backend Tasks**:
- [ ] Add endpoint: `POST /api/v1/items/bulk-import`
- [ ] Add endpoint: `POST /api/v1/movements/bulk-adjust`
- [ ] Add CSV parsing utilities
- [ ] Transaction handling for bulk ops

**Frontend Tasks**:
- [ ] File upload component
- [ ] CSV preview table
- [ ] Multi-select item grid
- [ ] Bulk action toolbar

**Files to Create**:
```
backend/pkg/utils/csv.go
frontend/src/components/bulk/ImportModal.tsx
frontend/src/components/bulk/BulkAdjustModal.tsx
```

**Estimated Effort**: 4-5 days

---

### 2.3 Alerts & Notifications System
**Goal**: Proactive notification system for inventory issues

**Tasks**:
- [ ] Real-time low stock alerts
- [ ] Out of stock notifications
- [ ] Email notifications (SMTP integration)
- [ ] In-app notification center
- [ ] Alert preferences per user
- [ ] Webhook support for external integrations

**Backend Tasks**:
- [x] Already have alerts table and endpoints
- [ ] Add email notification service
- [ ] Add WebSocket support for real-time updates
- [ ] Add notification preferences table
- [ ] Create background job for alert checks

**Frontend Tasks**:
- [ ] Notification bell with dropdown
- [ ] Toast notifications for new alerts
- [ ] Notification preferences page
- [ ] Mark as read functionality

**Files to Create**:
```
backend/internal/services/notification_service.go
backend/pkg/email/smtp.go
frontend/src/components/notifications/NotificationCenter.tsx
frontend/src/pages/NotificationSettingsPage.tsx
```

**Estimated Effort**: 5-6 days

---

## Phase 3: Advanced Features (Lower Priority)

### 3.1 User Management & Roles
**Goal**: Admin panel for managing team members

**Tasks**:
- [ ] User list page (admin only)
- [ ] Create/invite new users
- [ ] Edit user roles (ADMIN, MANAGER, USER)
- [ ] Deactivate/reactivate users
- [ ] Activity logs per user
- [ ] Password reset flow
- [ ] User profile page

**Backend Tasks**:
- [ ] Add endpoints: `GET/POST/PUT/DELETE /api/v1/users`
- [ ] Add role-based middleware guards
- [ ] Implement password reset tokens
- [ ] Add user activity logging

**Frontend Tasks**:
- [ ] Create `UsersPage.tsx` (admin only)
- [ ] User modal for create/edit
- [ ] Profile page for current user
- [ ] Password change form

**Estimated Effort**: 4-5 days

---

### 3.2 Reports & Export
**Goal**: Generate and export inventory reports

**Tasks**:
- [ ] Stock level report (current status)
- [ ] Movement report (by date range)
- [ ] Valuation report (inventory value)
- [ ] Low stock report
- [ ] Custom report builder
- [ ] Export to PDF, Excel, CSV
- [ ] Scheduled reports via email

**Backend Tasks**:
- [ ] Add report generation endpoints
- [ ] PDF generation library integration
- [ ] Excel generation (go-xlsx)
- [ ] Report templates

**Frontend Tasks**:
- [ ] Reports page with filters
- [ ] Report preview
- [ ] Export format selector
- [ ] Schedule report modal

**Estimated Effort**: 5-6 days

---

### 3.3 Multi-Location Support
**Goal**: Track inventory across multiple warehouses/locations

**Tasks**:
- [ ] Add locations table and CRUD
- [ ] Items belong to locations
- [ ] Transfer stock between locations
- [ ] Location-specific reports
- [ ] Location selector in UI

**Backend Tasks**:
- [ ] Design locations table schema
- [ ] Migrate item-location relationship
- [ ] Add transfer movement type
- [ ] Update all queries for location filtering

**Frontend Tasks**:
- [ ] Location management page
- [ ] Location selector in header
- [ ] Transfer stock modal
- [ ] Multi-location dashboard

**Estimated Effort**: 6-8 days

---

### 3.4 Mobile App (PWA)
**Goal**: Installable mobile app experience

**Tasks**:
- [ ] Configure PWA manifest
- [ ] Add service worker for offline support
- [ ] Implement app install prompt
- [ ] Optimize for mobile gestures
- [ ] Add barcode scanner (camera API)
- [ ] Offline queue for movements
- [ ] Push notifications

**Frontend Tasks**:
- [ ] Add `manifest.json` and icons
- [ ] Configure Vite PWA plugin
- [ ] Implement service worker
- [ ] Add install prompt component
- [ ] Integrate barcode scanner library

**Estimated Effort**: 4-5 days

---

### 3.5 Item Images & Attachments
**Goal**: Visual inventory with photos

**Tasks**:
- [ ] Upload item images
- [ ] Image storage (local or S3)
- [ ] Thumbnail generation
- [ ] Multiple images per item
- [ ] Attach documents (specs, invoices)
- [ ] Image gallery view

**Backend Tasks**:
- [ ] Add file upload endpoint
- [ ] Image processing (resize, thumbnail)
- [ ] S3/local storage abstraction
- [ ] Add item_images table

**Frontend Tasks**:
- [ ] Image upload component with preview
- [ ] Image gallery in item details
- [ ] Drag-and-drop upload

**Estimated Effort**: 4-5 days

---

## Phase 4: Production Readiness

### 4.1 Security Enhancements
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection
- [ ] Input sanitization audit
- [ ] SQL injection prevention audit
- [ ] XSS prevention audit
- [ ] Add security headers
- [ ] Implement refresh tokens
- [ ] API key authentication for integrations
- [ ] Audit logs for sensitive operations

**Estimated Effort**: 3-4 days

---

### 4.2 Performance Optimization
- [ ] Add database indexes
- [ ] Query optimization audit
- [ ] Implement response caching
- [ ] Add Redis for session storage
- [ ] Frontend code splitting
- [ ] Image lazy loading
- [ ] Virtual scrolling for long lists
- [ ] CDN for static assets

**Estimated Effort**: 3-4 days

---

### 4.3 Testing & Quality
- [ ] Increase backend test coverage to 80%+
- [ ] Add integration tests (API tests)
- [ ] Add frontend unit tests (Vitest)
- [ ] Add E2E tests (Playwright)
- [ ] Load testing (k6 or Artillery)
- [ ] Set up CI/CD pipeline
- [ ] Automated deployment

**Estimated Effort**: 5-6 days

---

### 4.4 Observability
- [ ] Structured logging with levels
- [ ] Request ID tracing
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Error tracking (Sentry)
- [ ] APM integration
- [ ] Health check endpoints

**Estimated Effort**: 3-4 days

---

### 4.5 Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide with screenshots
- [ ] Admin guide
- [ ] Deployment guide
- [ ] Development setup guide
- [ ] Architecture decision records
- [ ] Video tutorials

**Estimated Effort**: 3-4 days

---

## Phase 5: Advanced Integrations

### 5.1 Third-Party Integrations
- [ ] Accounting software (QuickBooks, Xero)
- [ ] E-commerce platforms (Shopify, WooCommerce)
- [ ] Shipping providers (FedEx, UPS)
- [ ] Barcode label printers
- [ ] POS system integration
- [ ] Webhook system for real-time sync

**Estimated Effort**: Varies by integration (3-5 days each)

---

### 5.2 API Improvements
- [ ] GraphQL API endpoint
- [ ] WebSocket support for real-time updates
- [ ] Batch API requests
- [ ] API versioning (v2)
- [ ] Developer portal
- [ ] SDK libraries (Python, JavaScript, Go)

**Estimated Effort**: 6-8 days

---

## Quick Wins (Can be done anytime)

### UI/UX Improvements
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements (ARIA labels)
- [ ] Print stylesheet
- [ ] Empty state illustrations
- [ ] Loading skeletons
- [ ] Confirmation dialogs for destructive actions
- [ ] Undo/redo for stock adjustments

### Nice-to-Have Features
- [ ] Item notes/comments
- [ ] Item tags/labels
- [ ] Favorites/starred items
- [ ] Recently viewed items
- [ ] Global search (items, categories, movements)
- [ ] Customizable dashboard widgets
- [ ] Item expiration date tracking
- [ ] Batch/lot number tracking
- [ ] Serial number tracking
- [ ] Min/max stock levels with auto-reorder

---

## Technical Debt & Refactoring

### Backend
- [ ] Add middleware for consistent error responses
- [ ] Extract magic numbers to constants
- [ ] Add request validation middleware
- [ ] Implement repository interfaces properly
- [ ] Add database connection pooling configuration
- [ ] Migrate to go-chi/v6 when stable

### Frontend
- [ ] Create design system/component library
- [ ] Extract common form patterns
- [ ] Implement error boundaries
- [ ] Add loading states globally
- [ ] Refactor large components into smaller ones
- [ ] Add Storybook for component documentation

---

## Deployment & DevOps

### Infrastructure
- [ ] Docker multi-stage builds
- [ ] Docker Compose for full stack
- [ ] Kubernetes manifests
- [ ] Terraform/Pulumi for IaC
- [ ] Automated backups
- [ ] Database migration strategy for production
- [ ] Blue-green deployment
- [ ] Health checks and readiness probes

### Monitoring
- [ ] Set up logging aggregation (ELK/Loki)
- [ ] Set up metrics collection (Prometheus)
- [ ] Set up alerting (PagerDuty, Opsgenie)
- [ ] Uptime monitoring
- [ ] Cost monitoring

---

## Community & Open Source (Optional)

If you decide to open-source the project:

- [ ] Choose appropriate license
- [ ] Contributor guidelines
- [ ] Code of conduct
- [ ] Issue templates
- [ ] PR templates
- [ ] Changelog
- [ ] Release process
- [ ] Demo instance
- [ ] Discord/Slack community

---

## Priority Matrix

### Must Have (MVP Complete ✅)
- Authentication
- Inventory CRUD
- Stock movements
- Dashboard

### Should Have (Phase 1-2)
- PostgreSQL support
- Movements history
- Categories management
- Advanced dashboard
- Bulk operations
- Notifications

### Nice to Have (Phase 3-4)
- User management
- Reports & export
- Multi-location
- PWA
- Images & attachments

### Could Have (Phase 5+)
- Third-party integrations
- GraphQL API
- Mobile native apps

---

## Estimated Timeline

Assuming 1 full-time developer:

- **Phase 1** (Core Enhancements): 1-2 weeks
- **Phase 2** (UX Improvements): 2-3 weeks
- **Phase 3** (Advanced Features): 4-6 weeks
- **Phase 4** (Production Ready): 2-3 weeks
- **Phase 5** (Integrations): Ongoing

**Total to Production**: ~3-4 months of development

---

## Getting Started with Next Steps

### Recommended Order

1. **PostgreSQL Support** - Critical for production
2. **Movements History Page** - High user value, low effort
3. **Categories Management** - Complete the core features
4. **Advanced Dashboard** - Increase engagement
5. **Security & Testing** - Before production deployment

### For Each Feature

1. Review requirements from arch.md
2. Design database changes (if needed)
3. Implement backend endpoints
4. Write backend tests
5. Implement frontend UI
6. Write frontend tests
7. Update documentation
8. Deploy to staging
9. User testing
10. Deploy to production

---

## Notes

- This roadmap is a living document - update as priorities change
- Each phase can be broken down into smaller sprints
- Consider user feedback to reprioritize features
- Technical debt should be addressed alongside new features
- Security and testing should not be postponed

## Questions to Answer Before Starting

1. **Target Deployment**: Cloud (AWS/GCP/Azure) or self-hosted?
2. **Scale**: How many concurrent users? Items in inventory?
3. **Budget**: Hosting costs, third-party services?
4. **Team Size**: Solo developer or team?
5. **Timeline**: Launch deadline?
6. **Business Model**: Free, paid, freemium?

---

**Last Updated**: 2025-10-24
**Current Version**: v0.1 (MVP)
**Next Milestone**: v0.2 (Phase 1 Complete)
