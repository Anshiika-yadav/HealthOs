/**
 * Mock authentication — active only when VITE_MOCK_AUTH=true
 * Used when the backend is not yet running.
 * Switch VITE_MOCK_AUTH=false in .env once the real backend is available.
 *
 * Test credentials:
 *   superadmin@test.com   / Test@1234  → super_admin
 *   admin@hospital.com    / Test@1234  → hospital_admin
 *   owner@hospital.com    / Test@1234  → hospital_owner
 *   doctor@hospital.com   / Test@1234  → doctor
 *   nurse@hospital.com    / Test@1234  → nurse
 *   reception@hospital.com/ Test@1234  → receptionist
 *   cashier@hospital.com  / Test@1234  → cashier
 *   pharmacy@hospital.com / Test@1234  → pharmacist
 *   lab@hospital.com      / Test@1234  → lab_technician
 *   inventory@hospital.com/ Test@1234  → inventory_officer
 *   auditor@hospital.com  / Test@1234  → auditor
 */

import type { AuthResponse, AuthUser, UserRole } from '@/types'

// ── Flag ──────────────────────────────────────────────────────────────────────
export const IS_MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true'

// ── Test users ────────────────────────────────────────────────────────────────
const TEST_USERS: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: 'superadmin@test.com',
    password: 'Test@1234',
    user: {
      id: 'u-001',
      name: 'Platform Admin',
      email: 'superadmin@test.com',
      role: 'super_admin',
      permissions: ['*'],
      tenantId: null,
      tenantName: null,
      tenantCode: null,
      branchId: null,
      branchName: null,
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'admin@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-002',
      name: 'Hospital Admin',
      email: 'admin@hospital.com',
      role: 'hospital_admin',
      permissions: ['hospital:manage'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'owner@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-003',
      name: 'Hospital Owner',
      email: 'owner@hospital.com',
      role: 'hospital_owner',
      permissions: ['hospital:own'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'doctor@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-004',
      name: 'Dr. Sarah Ahmed',
      email: 'doctor@hospital.com',
      role: 'doctor',
      permissions: ['encounters:write', 'prescriptions:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: 'dept-001',
      isActive: true,
    },
  },
  {
    email: 'nurse@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-005',
      name: 'Nurse Fatima',
      email: 'nurse@hospital.com',
      role: 'nurse',
      permissions: ['encounters:read', 'vitals:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: 'dept-001',
      isActive: true,
    },
  },
  {
    email: 'reception@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-006',
      name: 'Ali Receptionist',
      email: 'reception@hospital.com',
      role: 'receptionist',
      permissions: ['patients:write', 'appointments:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'cashier@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-007',
      name: 'Usman Cashier',
      email: 'cashier@hospital.com',
      role: 'cashier',
      permissions: ['billing:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'pharmacy@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-008',
      name: 'Zara Pharmacist',
      email: 'pharmacy@hospital.com',
      role: 'pharmacist',
      permissions: ['pharmacy:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'lab@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-009',
      name: 'Hassan Lab Tech',
      email: 'lab@hospital.com',
      role: 'lab_technician',
      permissions: ['lab:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: 'dept-002',
      isActive: true,
    },
  },
  {
    email: 'inventory@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-010',
      name: 'Bilal Inventory',
      email: 'inventory@hospital.com',
      role: 'inventory_officer',
      permissions: ['inventory:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'auditor@hospital.com',
    password: 'Test@1234',
    user: {
      id: 'u-011',
      name: 'Nadia Auditor',
      email: 'auditor@hospital.com',
      role: 'auditor',
      permissions: ['audit:read', 'reports:read'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Branch',
      departmentId: null,
      isActive: true,
    },
  },
]

// ── Login ─────────────────────────────────────────────────────────────────────
export function mockLogin(email: string, password: string): AuthResponse {
  const match = TEST_USERS.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  )
  if (!match) {
    const err = Object.assign(new Error('Invalid credentials'), {
      response: { data: { message: 'Invalid email or password.' } },
    })
    throw err
  }
  const token = btoa(
    JSON.stringify({ userId: match.user.id, role: match.user.role, exp: Date.now() + 8 * 3600 * 1000 })
  )
  return { user: match.user, accessToken: token, expiresAt: Date.now() + 8 * 3600 * 1000 }
}

// ── Get current user from token ───────────────────────────────────────────────
export function mockGetMe(token: string): AuthUser {
  try {
    const payload = JSON.parse(atob(token)) as { userId: string; role: UserRole; exp: number }
    if (Date.now() > payload.exp) throw new Error('Token expired')
    const match = TEST_USERS.find((u) => u.user.id === payload.userId)
    if (!match) throw new Error('User not found')
    return match.user
  } catch {
    throw new Error('Invalid session')
  }
}
