// ─── Auth & Session ────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
  tenantCode?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  tenantId: string | null;
  tenantName: string | null;
  tenantCode: string | null;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  avatar?: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

// ─── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole =
  | 'super_admin'
  | 'hospital_owner'
  | 'hospital_admin'
  | 'receptionist'
  | 'doctor'
  | 'nurse'
  | 'cashier'
  | 'pharmacist'
  | 'lab_technician'
  | 'inventory_officer'
  | 'auditor';

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Tenant ────────────────────────────────────────────────────────────────────
export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'trial' | 'expired';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  status: TenantStatus;
  branchCount: number;
  userCount: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  licenseStatus: string;
  logoUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface TenantDetail extends Tenant {
  website?: string;
  timezone: string;
  currency: string;
  branches: Branch[];
  subscription?: Subscription;
  license?: License;
}

// ─── Branch ────────────────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  isActive: boolean;
  isHeadquarters: boolean;
  departmentCount: number;
  userCount: number;
  createdAt: string;
}

// ─── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  headName?: string;
  createdAt: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export interface Service {
  id: string;
  tenantId: string;
  departmentId?: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  currency: string;
  taxRate: number;
  isActive: boolean;
}

// ─── Subscription ──────────────────────────────────────────────────────────────
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended' | 'grace_period';

export interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  billingCycle: 'monthly' | 'annual';
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  invoiceStatus: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── License ───────────────────────────────────────────────────────────────────
export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'pending';

export interface License {
  id: string;
  key: string;
  tenantId: string;
  tenantName: string;
  issuedTo: string;
  maxUsers: number;
  maxBranches: number;
  expiryDate: string;
  status: LicenseStatus;
  notes?: string;
  issuedAt: string;
  revokedAt?: string;
}

// ─── User ──────────────────────────────────────────────────────────────────────
export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  status: UserStatus;
  invitationStatus?: 'pending' | 'accepted' | 'expired';
  lastLoginAt?: string;
  createdAt: string;
  avatar?: string;
}

// ─── Patient ───────────────────────────────────────────────────────────────────
export type PatientStatus = 'active' | 'inactive' | 'deceased';
export type Gender = 'male' | 'female' | 'other';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  age?: number;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  nextOfKin?: string;
  nextOfKinPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  identificationNumber?: string;
  identificationType?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  bloodGroup?: string;
  allergies?: string[];
  status: PatientStatus;
  tenantId: string;
  branchId?: string;
  registeredById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientTimeline {
  id: string;
  type: 'appointment' | 'encounter' | 'invoice' | 'lab_result' | 'prescription' | 'note';
  title: string;
  description?: string;
  date: string;
  status?: string;
  refId: string;
}

// ─── Appointment ───────────────────────────────────────────────────────────────
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'emergency' | 'other';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  providerId: string;
  providerName: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  queueNumber?: number;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Queue ─────────────────────────────────────────────────────────────────────
export type QueueStatus = 'waiting' | 'called' | 'with_provider' | 'completed' | 'no_show' | 'transferred';

export interface QueueEntry {
  id: string;
  queueNumber: number;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  providerId: string;
  providerName: string;
  departmentId: string;
  departmentName: string;
  appointmentTime: string;
  checkedInAt: string;
  calledAt?: string;
  completedAt?: string;
  waitDurationMinutes?: number;
  status: QueueStatus;
  notes?: string;
}

// ─── Encounter ─────────────────────────────────────────────────────────────────
export type EncounterStatus = 'draft' | 'in_progress' | 'finalized' | 'amended';

export interface Encounter {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  appointmentId?: string;
  providerId: string;
  providerName: string;
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  date: string;
  chiefComplaint: string;
  vitals?: Vitals;
  examination?: string;
  diagnoses: Diagnosis[];
  treatmentPlan?: string;
  notes?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  status: EncounterStatus;
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vitals {
  temperature?: number;
  temperatureUnit?: 'C' | 'F';
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  height?: number;
  heightUnit?: 'cm' | 'ft';
  bmi?: number;
}

export interface Diagnosis {
  id?: string;
  icdCode?: string;
  name: string;
  type: 'primary' | 'secondary' | 'differential';
  notes?: string;
}

// ─── Prescription ──────────────────────────────────────────────────────────────
export type PrescriptionStatus = 'draft' | 'active' | 'dispensed' | 'partially_dispensed' | 'cancelled' | 'expired';

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  refills: number;
  substitutionAllowed: boolean;
  quantity?: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string;
  prescriberId: string;
  prescriberName: string;
  items: PrescriptionItem[];
  status: PrescriptionStatus;
  notes?: string;
  dispensedAt?: string;
  dispensedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Invoice & Billing ─────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'posted' | 'partially_paid' | 'paid' | 'cancelled' | 'refunded';

export interface InvoiceItem {
  id: string;
  description: string;
  serviceId?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'pos' | 'wallet' | 'insurance' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'reversed' | 'failed';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  receivedById: string;
  receivedByName: string;
  notes?: string;
  status: PaymentStatus;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface Refund {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Lab ────────────────────────────────────────────────────────────────────────
export type LabOrderStatus = 'ordered' | 'collected' | 'received' | 'processing' | 'verified' | 'released';
export type LabPriority = 'routine' | 'urgent' | 'stat';

export interface LabTest {
  id: string;
  name: string;
  code: string;
  unit?: string;
  referenceRange?: string;
  category: string;
}

export interface LabOrderItem {
  id: string;
  testId: string;
  testName: string;
  testCode: string;
  status: LabOrderStatus;
  resultValue?: string;
  resultUnit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  resultNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  encounterId?: string;
  orderedById: string;
  orderedByName: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  priority: LabPriority;
  tests: LabOrderItem[];
  sampleType?: string;
  sampleCollectedAt?: string;
  sampleReceivedAt?: string;
  status: LabOrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ─────────────────────────────────────────────────────────────────
export type StockMovementType = 'receive' | 'transfer' | 'adjustment' | 'dispense' | 'wastage' | 'count';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stockOnHand: number;
  reorderLevel: number;
  location?: string;
  isActive: boolean;
  expiryDate?: string;
  batches?: InventoryBatch[];
  tenantId: string;
  branchId?: string;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: string;
  receivedDate: string;
  supplierId?: string;
  supplierName?: string;
  costPrice?: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  fromBranchId?: string;
  fromBranchName?: string;
  toBranchId?: string;
  toBranchName?: string;
  reason?: string;
  batchNumber?: string;
  performedById: string;
  performedByName: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  expectedDelivery?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  total: number;
  receivedQuantity?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  tenantId?: string;
  tenantName?: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  device?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Notification ──────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  module: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─── API Common ────────────────────────────────────────────────────────────────
export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
}
