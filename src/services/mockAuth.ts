/**
 * DEVELOPMENT-ONLY mock authentication.
 * Activated only when VITE_MOCK_AUTH=true in .env
 * In production mode this module is never used.
 *
 * Demo credentials:
 *   superadmin@healthos.dev   / demo1234   → super_admin
 *   admin@hospital.dev        / demo1234   → hospital_admin
 *   owner@hospital.dev        / demo1234   → hospital_owner
 *   doctor@hospital.dev       / demo1234   → doctor
 *   nurse@hospital.dev        / demo1234   → nurse
 *   receptionist@hospital.dev / demo1234   → receptionist
 *   cashier@hospital.dev      / demo1234   → cashier
 *   pharmacist@hospital.dev   / demo1234   → pharmacist
 *   labtech@hospital.dev      / demo1234   → lab_technician
 *   inventory@hospital.dev    / demo1234   → inventory_officer
 *   auditor@hospital.dev      / demo1234   → auditor
 */

import type { AuthResponse, AuthUser, UserRole } from '@/types'

const MOCK_USERS: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: 'superadmin@healthos.dev',
    password: 'demo1234',
    user: {
      id: 'usr-001',
      name: 'Super Admin',
      email: 'superadmin@healthos.dev',
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
    email: 'admin@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-002',
      name: 'Hospital Admin',
      email: 'admin@hospital.dev',
      role: 'hospital_admin',
      permissions: ['hospital:manage'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'owner@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-003',
      name: 'Hospital Owner',
      email: 'owner@hospital.dev',
      role: 'hospital_owner',
      permissions: ['hospital:own'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'doctor@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-004',
      name: 'Dr. Sarah Ahmed',
      email: 'doctor@hospital.dev',
      role: 'doctor',
      permissions: ['encounters:write', 'prescriptions:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: 'dept-001',
      isActive: true,
    },
  },
  {
    email: 'nurse@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-005',
      name: 'Nurse Fatima',
      email: 'nurse@hospital.dev',
      role: 'nurse',
      permissions: ['encounters:read', 'vitals:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: 'dept-001',
      isActive: true,
    },
  },
  {
    email: 'receptionist@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-006',
      name: 'Ali Receptionist',
      email: 'receptionist@hospital.dev',
      role: 'receptionist',
      permissions: ['patients:write', 'appointments:write', 'queue:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'cashier@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-007',
      name: 'Cashier Usman',
      email: 'cashier@hospital.dev',
      role: 'cashier',
      permissions: ['billing:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'pharmacist@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-008',
      name: 'Pharmacist Zara',
      email: 'pharmacist@hospital.dev',
      role: 'pharmacist',
      permissions: ['pharmacy:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'labtech@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-009',
      name: 'Lab Tech Hassan',
      email: 'labtech@hospital.dev',
      role: 'lab_technician',
      permissions: ['lab:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: 'dept-002',
      isActive: true,
    },
  },
  {
    email: 'inventory@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-010',
      name: 'Inventory Officer Bilal',
      email: 'inventory@hospital.dev',
      role: 'inventory_officer',
      permissions: ['inventory:write'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
  {
    email: 'auditor@hospital.dev',
    password: 'demo1234',
    user: {
      id: 'usr-011',
      name: 'Auditor Nadia',
      email: 'auditor@hospital.dev',
      role: 'auditor',
      permissions: ['audit:read', 'reports:read'],
      tenantId: 'ten-001',
      tenantName: 'City General Hospital',
      tenantCode: 'CGH-001',
      branchId: 'br-001',
      branchName: 'Main Campus',
      departmentId: null,
      isActive: true,
    },
  },
]

export function mockLogin(email: string, password: string): AuthResponse {
  const match = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )

  if (!match) {
    throw new Error('INVALID_CREDENTIALS')
  }

  const fakeToken = btoa(JSON.stringify({ userId: match.user.id, role: match.user.role, exp: Date.now() + 8 * 3600 * 1000 }))

  return {
    user: match.user,
    accessToken: fakeToken,
    expiresAt: Date.now() + 8 * 3600 * 1000,
  }
}

export function mockGetMe(token: string): AuthUser {
  try {
    const payload = JSON.parse(atob(token)) as { userId: string; role: UserRole }
    const match = MOCK_USERS.find((u) => u.user.id === payload.userId)
    if (!match) throw new Error('User not found')
    return match.user
  } catch {
    throw new Error('Invalid token')
  }
}

export const IS_MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === 'true'
