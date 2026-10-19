# HealthOS — Hospital Management Platform Frontend

A complete multi-tenant hospital management SaaS frontend built with React, TypeScript, Vite, and Tailwind CSS.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL to your backend URL
npm run dev
```

## Build

```bash
npm run build        # Production build
npm run typecheck    # TypeScript type-check only
npm run preview      # Preview production build locally
```

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Data fetching & caching |
| React Hook Form + Zod | Forms and validation |
| Axios | HTTP client |
| Tailwind CSS | Styling |
| Recharts | Charts and analytics |
| Lucide React | Icons |
| date-fns | Date utilities |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend REST API base URL (no trailing slash) |

## Features

### Platform Administration (super_admin)
- Platform dashboard with hospital growth metrics
- Hospital (tenant) management — list, detail, activate/suspend
- Subscription lifecycle management
- License key issuance and revocation
- Platform user management with role-based invitations
- Audit log viewer (read-only) with export
- Platform-level reports and analytics

### Hospital Administration
- Hospital dashboard with daily operational metrics
- Branch, department, and service management
- Staff management and invitations
- Hospital settings (profile, timezone, currency)

### Patient Management
- Patient directory with search and filtering
- Patient registration with duplicate detection
- Patient profile and care timeline

### Clinical Workflows
- Appointment scheduling, rescheduling, cancellation
- Queue management with real-time check-in flow
- Clinical encounter workspace (draft → finalize)
- Vitals recording, diagnosis entry, treatment plans
- Prescription creation and pharmacy dispensing

### Billing & Finance
- Invoice creation with line items and totals
- Payment collection (cash, card, transfer, wallet)
- Receipt management
- Authorized refund workflow

### Pharmacy
- Prescription worklist
- Full and partial medication dispensing
- Stock visibility

### Laboratory
- Lab order worklist with sample status tracking
- Result entry, verification, and release workflow

### Inventory
- Inventory item management with batch/expiry tracking
- Stock movements (receive, transfer, adjust)
- Purchase order management
- Supplier directory
- Low-stock alerts

### Reports
- Revenue, patient volume, stock, and platform reports
- Date-range filtering
- CSV/PDF export (backend dependent)

## Security Notes

- Authentication tokens are stored in `sessionStorage` only (short-lived)
- All tenant-scoped API calls use the authenticated session context
- Role-based route guards protect all authenticated routes
- Confirmation dialogs on all destructive/financial actions
- Audit records are always read-only

## Backend API Integration

The frontend expects a REST API at `VITE_API_BASE_URL`. Key endpoint groups:

```
/auth/login, /auth/logout, /auth/me, /auth/refresh, /auth/reset-password
/admin/tenants, /admin/subscriptions, /admin/licenses
/users, /users/invite
/patients, /appointments, /encounters
/invoices, /payments, /refunds, /receipts
/prescriptions, /dispenses
/lab-orders, /lab-results
/stock/items, /stock/movements, /purchase-orders, /suppliers
/reports/summary, /reports/revenue, /reports/stock, /reports/patients
/audit-logs, /notifications, /queue/today
/branches, /departments, /services, /settings
```

If a backend endpoint is not yet implemented, the UI will show an empty state or error state — it will not fabricate data.

## Project Structure

```
src/
├── app/           App.tsx (root component + router)
├── components/    Reusable UI: Button, Input, Modal, DataTable, Toast, etc.
├── features/      Feature modules (auth, dashboard, patients, billing, etc.)
├── services/      API service layer (one file per domain)
├── routes/        Route guards and error pages
├── types/         Shared TypeScript types
├── utils/         Format helpers, cn() utility
└── styles/        global.css (Tailwind)
```
