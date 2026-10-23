import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleRedirect } from '@/routes/RoleRedirect'
import { AppShell } from '@/components/layout/AppShell'

// ── Auth ──────────────────────────────────────────────────────────────────────
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AcceptInvitationPage } from '@/features/auth/AcceptInvitationPage'
import { ProfilePage } from '@/features/auth/ProfilePage'

// ── Error pages ───────────────────────────────────────────────────────────────
import { NotFoundPage } from '@/routes/NotFoundPage'
import { AccessDeniedPage } from '@/routes/AccessDeniedPage'

// ── Platform Admin ────────────────────────────────────────────────────────────
import { PlatformDashboard } from '@/features/dashboard/PlatformDashboard'
import { TenantList } from '@/features/tenants/TenantList'
import { TenantDetail } from '@/features/tenants/TenantDetail'
import { TenantForm } from '@/features/tenants/TenantForm'
import { LicenseList } from '@/features/licenses/LicenseList'
import { SubscriptionList } from '@/features/subscriptions/SubscriptionList'
import { UserList } from '@/features/users/UserList'
import { AuditLogList } from '@/features/audit/AuditLogList'
import { ReportsDashboard } from '@/features/reports/ReportsDashboard'

// ── Hospital ──────────────────────────────────────────────────────────────────
import { HospitalDashboard } from '@/features/dashboard/HospitalDashboard'
import { HospitalSettings } from '@/features/settings/HospitalSettings'

// ── Patients ──────────────────────────────────────────────────────────────────
import { PatientList } from '@/features/patients/PatientList'
import { PatientRegistration } from '@/features/patients/PatientRegistration'
import { PatientProfile } from '@/features/patients/PatientProfile'
import { PatientEditPage } from '@/features/patients/PatientEditPage'

// ── Appointments & Queue ──────────────────────────────────────────────────────
import { AppointmentList } from '@/features/appointments/AppointmentList'
import { AppointmentForm } from '@/features/appointments/AppointmentForm'
import { AppointmentDetail } from '@/features/appointments/AppointmentDetail'
import { QueueManagement } from '@/features/queue/QueueManagement'

// ── Encounters ────────────────────────────────────────────────────────────────
import { EncounterList } from '@/features/encounters/EncounterList'
import { EncounterWorkspace } from '@/features/encounters/EncounterWorkspace'
import { DischargeSummary } from '@/features/encounters/DischargeSummary'

// ── Prescriptions ─────────────────────────────────────────────────────────────
import { PrescriptionList } from '@/features/prescriptions/PrescriptionList'
import { PrescriptionForm } from '@/features/prescriptions/PrescriptionForm'
import { PrescriptionDetail } from '@/features/prescriptions/PrescriptionDetail'

// ── Billing ───────────────────────────────────────────────────────────────────
import { InvoiceList } from '@/features/billing/InvoiceList'
import { InvoiceForm } from '@/features/billing/InvoiceForm'
import { InvoiceDetail } from '@/features/billing/InvoiceDetail'
import { PaymentCollection } from '@/features/billing/PaymentCollection'
import { RefundList } from '@/features/billing/RefundList'

// ── Pharmacy ──────────────────────────────────────────────────────────────────
import { PharmacyDashboard } from '@/features/pharmacy/PharmacyDashboard'

// ── Laboratory ────────────────────────────────────────────────────────────────
import { LabWorklist } from '@/features/laboratory/LabWorklist'
import { LabOrderForm } from '@/features/laboratory/LabOrderForm'
import { LabOrderDetail } from '@/features/laboratory/LabOrderDetail'
import { LabResultEntry } from '@/features/laboratory/LabResultEntry'

// ── Inventory ─────────────────────────────────────────────────────────────────
import { InventoryDashboard } from '@/features/inventory/InventoryDashboard'
import { InventoryItemList } from '@/features/inventory/InventoryItemList'
import { InventoryItemForm } from '@/features/inventory/InventoryItemForm'
import { InventoryItemDetail } from '@/features/inventory/InventoryItemDetail'
import { StockMovementForm } from '@/features/inventory/StockMovementForm'
import { SupplierList } from '@/features/inventory/SupplierList'
import { PurchaseOrderList } from '@/features/inventory/PurchaseOrderList'
import { PurchaseOrderForm } from '@/features/inventory/PurchaseOrderForm'
import { PurchaseOrderDetail } from '@/features/inventory/PurchaseOrderDetail'

// ── Notifications ─────────────────────────────────────────────────────────────
import { NotificationList } from '@/features/notifications/NotificationList'

// ── Role sets ─────────────────────────────────────────────────────────────────
const SUPER_ADMIN    = ['super_admin'] as const
const HOSPITAL_ROLES = ['hospital_owner', 'hospital_admin'] as const
const CLINICAL       = ['hospital_owner', 'hospital_admin', 'doctor', 'nurse'] as const
const FRONT_DESK     = ['hospital_owner', 'hospital_admin', 'receptionist'] as const
const BILLING_ROLES  = ['hospital_owner', 'hospital_admin', 'cashier'] as const
const PHARMACY_ROLES = ['hospital_owner', 'hospital_admin', 'pharmacist'] as const
const LAB_ROLES      = ['hospital_owner', 'hospital_admin', 'lab_technician', 'doctor', 'nurse'] as const
const INVENTORY_ROLES= ['hospital_owner', 'hospital_admin', 'inventory_officer'] as const
const ALL_HOSPITAL   = [
  'hospital_owner', 'hospital_admin', 'receptionist', 'doctor', 'nurse',
  'cashier', 'pharmacist', 'lab_technician', 'inventory_officer', 'auditor',
] as const
const PRESCRIBERS    = ['hospital_owner', 'hospital_admin', 'doctor', 'nurse', 'pharmacist'] as const

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              {/* ─── Public ──────────────────────────────────────────────── */}
              <Route path="/login"              element={<LoginPage />} />
              <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
              <Route path="/reset-password"     element={<ResetPasswordPage />} />
              <Route path="/accept-invitation"  element={<AcceptInvitationPage />} />
              <Route path="/access-denied"      element={<AccessDeniedPage />} />

              {/* Root redirect */}
              <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

              {/* ─── Platform Admin ───────────────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={[...SUPER_ADMIN]}><AppShell /></ProtectedRoute>}>
                <Route path="/admin/dashboard"                    element={<PlatformDashboard />} />
                <Route path="/admin/tenants"                      element={<TenantList />} />
                <Route path="/admin/tenants/new"                  element={<TenantForm />} />
                <Route path="/admin/tenants/:id"                  element={<TenantDetail />} />
                <Route path="/admin/tenants/:id/edit"             element={<TenantForm />} />
                <Route path="/admin/subscriptions"                element={<SubscriptionList />} />
                <Route path="/admin/licenses"                     element={<LicenseList />} />
                <Route path="/admin/users"                        element={<UserList />} />
                <Route path="/admin/audit"                        element={<AuditLogList />} />
                <Route path="/admin/reports"                      element={<ReportsDashboard />} />
                <Route path="/admin/settings"                     element={<HospitalSettings />} />
                <Route path="/admin/notifications"                element={<NotificationList />} />
                <Route path="/profile"                            element={<ProfilePage />} />
              </Route>

              {/* ─── Hospital Shell ───────────────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={[...ALL_HOSPITAL]}><AppShell /></ProtectedRoute>}>

                {/* Core */}
                <Route path="/dashboard"      element={<HospitalDashboard />} />
                <Route path="/profile"        element={<ProfilePage />} />
                <Route path="/notifications"  element={<NotificationList />} />

                {/* Patients */}
                <Route path="/patients" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist','doctor','nurse']}>
                    <PatientList />
                  </ProtectedRoute>
                }/>
                <Route path="/patients/new" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist']}>
                    <PatientRegistration />
                  </ProtectedRoute>
                }/>
                <Route path="/patients/:id" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist','doctor','nurse','cashier']}>
                    <PatientProfile />
                  </ProtectedRoute>
                }/>
                <Route path="/patients/:id/edit" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist']}>
                    <PatientEditPage />
                  </ProtectedRoute>
                }/>

                {/* Appointments */}
                <Route path="/appointments" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist','doctor','nurse']}>
                    <AppointmentList />
                  </ProtectedRoute>
                }/>
                <Route path="/appointments/new" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist']}>
                    <AppointmentForm />
                  </ProtectedRoute>
                }/>
                <Route path="/appointments/:id" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist','doctor','nurse']}>
                    <AppointmentDetail />
                  </ProtectedRoute>
                }/>

                {/* Queue */}
                <Route path="/queue" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','receptionist']}>
                    <QueueManagement />
                  </ProtectedRoute>
                }/>

                {/* Encounters */}
                <Route path="/encounters" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <EncounterList />
                  </ProtectedRoute>
                }/>
                <Route path="/encounters/new" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <EncounterWorkspace />
                  </ProtectedRoute>
                }/>
                <Route path="/encounters/:id" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <EncounterWorkspace />
                  </ProtectedRoute>
                }/>
                <Route path="/encounters/:id/discharge" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <DischargeSummary />
                  </ProtectedRoute>
                }/>

                {/* Prescriptions */}
                <Route path="/prescriptions" element={
                  <ProtectedRoute allowedRoles={[...PRESCRIBERS]}>
                    <PrescriptionList />
                  </ProtectedRoute>
                }/>
                <Route path="/prescriptions/new" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <PrescriptionForm />
                  </ProtectedRoute>
                }/>
                <Route path="/prescriptions/:id" element={
                  <ProtectedRoute allowedRoles={[...PRESCRIBERS]}>
                    <PrescriptionDetail />
                  </ProtectedRoute>
                }/>

                {/* Billing */}
                <Route path="/billing" element={<Navigate to="/billing/invoices" replace />}/>
                <Route path="/billing/invoices" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <InvoiceList />
                  </ProtectedRoute>
                }/>
                <Route path="/billing/invoices/new" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <InvoiceForm />
                  </ProtectedRoute>
                }/>
                <Route path="/billing/invoices/:id" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <InvoiceDetail />
                  </ProtectedRoute>
                }/>
                <Route path="/billing/invoices/:id/edit" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <InvoiceForm />
                  </ProtectedRoute>
                }/>
                <Route path="/billing/payments/new" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <PaymentCollection />
                  </ProtectedRoute>
                }/>
                <Route path="/billing/refunds" element={
                  <ProtectedRoute allowedRoles={[...BILLING_ROLES]}>
                    <RefundList />
                  </ProtectedRoute>
                }/>

                {/* Pharmacy */}
                <Route path="/pharmacy" element={
                  <ProtectedRoute allowedRoles={[...PHARMACY_ROLES]}>
                    <PharmacyDashboard />
                  </ProtectedRoute>
                }/>

                {/* Laboratory */}
                <Route path="/laboratory" element={
                  <ProtectedRoute allowedRoles={[...LAB_ROLES]}>
                    <LabWorklist />
                  </ProtectedRoute>
                }/>
                <Route path="/laboratory/orders/new" element={
                  <ProtectedRoute allowedRoles={[...CLINICAL]}>
                    <LabOrderForm />
                  </ProtectedRoute>
                }/>
                <Route path="/laboratory/orders/:id" element={
                  <ProtectedRoute allowedRoles={[...LAB_ROLES]}>
                    <LabOrderDetail />
                  </ProtectedRoute>
                }/>
                <Route path="/laboratory/orders/:id/results" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','lab_technician']}>
                    <LabResultEntry />
                  </ProtectedRoute>
                }/>

                {/* Inventory */}
                <Route path="/inventory" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <InventoryDashboard />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/items" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <InventoryItemList />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/items/new" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <InventoryItemForm />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/items/:id" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <InventoryItemDetail />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/items/:id/edit" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <InventoryItemForm />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/movements/new" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <StockMovementForm />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/suppliers" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <SupplierList />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/purchase-orders" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <PurchaseOrderList />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/purchase-orders/new" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <PurchaseOrderForm />
                  </ProtectedRoute>
                }/>
                <Route path="/inventory/purchase-orders/:id" element={
                  <ProtectedRoute allowedRoles={[...INVENTORY_ROLES]}>
                    <PurchaseOrderDetail />
                  </ProtectedRoute>
                }/>

                {/* Reports */}
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['hospital_owner','hospital_admin','cashier','auditor']}>
                    <ReportsDashboard />
                  </ProtectedRoute>
                }/>

                {/* Audit */}
                <Route path="/audit" element={
                  <ProtectedRoute allowedRoles={['hospital_admin','auditor']}>
                    <AuditLogList />
                  </ProtectedRoute>
                }/>

                {/* Users */}
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={[...HOSPITAL_ROLES]}>
                    <UserList />
                  </ProtectedRoute>
                }/>

                {/* Settings */}
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={[...HOSPITAL_ROLES]}>
                    <HospitalSettings />
                  </ProtectedRoute>
                }/>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
