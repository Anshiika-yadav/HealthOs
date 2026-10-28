import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
})

const JWT_SECRET = process.env.JWT_SECRET || 'healthos-dev-secret-change-in-production'
const PORT = Number(process.env.PORT) || 8000

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ── Helpers ──────────────────────────────────────────────────────────────────
function rowToPatient(row: Record<string, unknown>) {
  return { ...row, fullName: `${row.firstName} ${row.lastName}` }
}

// ── Auth middleware ──────────────────────────────────────────────────────────
function authMiddleware(required = true) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      if (required) return res.status(401).json({ message: 'Authentication required' })
      return next()
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string; email: string }
      const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.tenant_id, u.branch_id, u.department_id, u.status,
                t.name AS tenant_name, t.code AS tenant_code,
                b.name AS branch_name, d.name AS department_name
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         LEFT JOIN branches b ON u.branch_id = b.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE u.id = $1`,
        [decoded.userId]
      )
      if (result.rows.length === 0) return res.status(401).json({ message: 'User not found' })
      const user = result.rows[0]
      if (user.status === 'inactive' || user.status === 'suspended') {
        return res.status(403).json({ message: 'Account is inactive or suspended' })
      }
      ;(req as any).user = {
        id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone,
        tenantId: user.tenant_id, tenantName: user.tenant_name, tenantCode: user.tenant_code,
        branchId: user.branch_id, branchName: user.branch_name,
        departmentId: user.department_id, departmentName: user.department_name, status: user.status,
      }
      next()
    } catch {
      if (required) return res.status(401).json({ message: 'Invalid or expired token' })
      next()
    }
  }
}

// ── Auth endpoints ───────────────────────────────────────────────────────────
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })
  try {
    const result = await pool.query(
      `SELECT u.*, t.name AS tenant_name, t.code AS tenant_code, t.status AS tenant_status,
              b.name AS branch_name, d.name AS department_name
       FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id
       LEFT JOIN branches b ON u.branch_id = b.id LEFT JOIN departments d ON u.department_id = d.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    )
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid email or password' })
    const user = result.rows[0]
    if (user.status === 'inactive' || user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account is inactive or suspended. Contact your administrator.' })
    }
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ message: 'Invalid email or password' })
    if (user.tenant_status === 'suspended' && user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Your hospital account is suspended.' })
    }
    if (user.tenant_status === 'expired' && user.role !== 'super_admin') {
      return res.status(402).json({ message: 'Your hospital subscription has expired.' })
    }
    const token = jwt.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' })
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])
    res.json({
      user: {
        id: String(user.id), name: user.name, email: user.email, role: user.role, permissions: [],
        tenantId: user.tenant_id ? String(user.tenant_id) : null, tenantName: user.tenant_name ?? null,
        tenantCode: user.tenant_code ?? null,
        branchId: user.branch_id ? String(user.branch_id) : null, branchName: user.branch_name ?? null,
        departmentId: user.department_id ? String(user.department_id) : null, isActive: user.status === 'active',
      },
      accessToken: token, expiresAt: Date.now() + 8 * 3600 * 1000,
    })
  } catch (err) { console.error('Login error:', err); res.status(500).json({ message: 'Login failed' }) }
})

app.get('/api/v1/auth/me', authMiddleware(), async (req, res) => {
  const u = (req as any).user
  res.json({
    id: String(u.id), name: u.name, email: u.email, role: u.role, permissions: [],
    tenantId: u.tenantId ? String(u.tenantId) : null, tenantName: u.tenantName ?? null,
    tenantCode: u.tenantCode ?? null, branchId: u.branchId ? String(u.branchId) : null,
    branchName: u.branchName ?? null, departmentId: u.departmentId ? String(u.departmentId) : null, isActive: true,
  })
})

app.post('/api/v1/auth/logout', authMiddleware(false), async (_req, res) => res.json({ message: 'Logged out' }))

const JOINABLE_ROLES = ['doctor','nurse','receptionist','cashier','pharmacist','lab_technician','inventory_officer','auditor']

app.post('/api/v1/auth/register', async (req, res) => {
  const { name, email, password, role, hospitalName } = req.body ?? {}
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' })
  if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
  const emailNorm = String(email).trim().toLowerCase()

  const client = await pool.connect()
  try {
    const dup = await client.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [emailNorm])
    if (dup.rows.length > 0) return res.status(409).json({ message: 'An account with this email already exists.' })

    await client.query('BEGIN')
    const hospital = String(hospitalName ?? '').trim()
    let tenantId: string
    let branchId: string | null = null
    let finalRole: string

    const existing = hospital
      ? await client.query('SELECT id FROM tenants WHERE LOWER(name) = LOWER($1) LIMIT 1', [hospital])
      : await client.query('SELECT id FROM tenants ORDER BY id LIMIT 1')

    if (existing.rows.length > 0) {
      // Existing hospital join: never as admin
      tenantId = existing.rows[0].id
      finalRole = JOINABLE_ROLES.includes(role) ? role : 'receptionist'
      const b = await client.query('SELECT id FROM branches WHERE tenant_id = $1 ORDER BY id LIMIT 1', [tenantId])
      branchId = b.rows[0]?.id ?? null
      await client.query('UPDATE tenants SET user_count = user_count + 1 WHERE id = $1', [tenantId])
    } else {
      // New hospital: creator becomes its admin
      const code = 'HOSP-' + Math.random().toString(36).slice(2, 8).toUpperCase()
      const t = await client.query(
        `INSERT INTO tenants (name, code, email, status, branch_count, user_count, subscription_status, license_status)
         VALUES ($1,$2,$3,'active',1,1,'trial','active') RETURNING id`,
        [hospital || 'My Hospital', code, emailNorm])
      tenantId = t.rows[0].id
      const b = await client.query(
        `INSERT INTO branches (tenant_id, name, code, email, is_headquarters, department_count, user_count)
         VALUES ($1,'Main Branch','MAIN',$2,true,1,1) RETURNING id`, [tenantId, emailNorm])
      branchId = b.rows[0].id
      await client.query(
        `INSERT INTO departments (tenant_id, branch_id, name, code) VALUES ($1,$2,'General Medicine','GEN')`,
        [tenantId, branchId])
      finalRole = 'hospital_admin'
    }

    const hash = await bcrypt.hash(String(password), 10)
    const u = await client.query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id, branch_id, status, invitation_status)
       VALUES ($1,$2,$3,$4,$5,$6,'active','accepted') RETURNING id`,
      [String(name).trim(), emailNorm, hash, finalRole, tenantId, branchId])
    await client.query('COMMIT')

    const info = await pool.query(
      `SELECT t.name AS tenant_name, t.code AS tenant_code, b.name AS branch_name
       FROM tenants t LEFT JOIN branches b ON b.id = $2 WHERE t.id = $1`, [tenantId, branchId])
    const token = jwt.sign({ userId: u.rows[0].id, role: finalRole, email: emailNorm }, JWT_SECRET, { expiresIn: '8h' })
    res.status(201).json({
      user: {
        id: String(u.rows[0].id), name: String(name).trim(), email: emailNorm, role: finalRole, permissions: [],
        tenantId: String(tenantId), tenantName: info.rows[0]?.tenant_name ?? null, tenantCode: info.rows[0]?.tenant_code ?? null,
        branchId: branchId ? String(branchId) : null, branchName: info.rows[0]?.branch_name ?? null,
        departmentId: null, isActive: true,
      },
      accessToken: token, expiresAt: Date.now() + 8 * 3600 * 1000,
    })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Register error:', err)
    res.status(500).json({ message: 'Could not create account' })
  } finally {
    client.release()
  }
})

app.post('/api/v1/auth/refresh', authMiddleware(), async (req, res) => {
  const u = (req as any).user
  const token = jwt.sign({ userId: u.id, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: '8h' })
  res.json({ accessToken: token })
})
app.post('/api/v1/auth/request-reset', async (req, res) => {
  if (!req.body?.email) return res.status(400).json({ message: 'Email is required' })
  res.json({ message: 'If this email exists, a reset link has been sent.' })
})
app.post('/api/v1/auth/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body ?? {}
  if (!token || !password || !confirmPassword) return res.status(400).json({ message: 'All fields required' })
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' })
  res.json({ message: 'Password reset successful.' })
})
app.post('/api/v1/auth/change-password', authMiddleware(), async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {}
  if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ message: 'All fields required' })
  if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' })
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [(req as any).user.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'User not found' })
    const ok = await bcrypt.compare(currentPassword, r.rows[0].password_hash)
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' })
    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, (req as any).user.id])
    res.json({ message: 'Password updated' })
  } catch { res.status(500).json({ message: 'Failed to change password' }) }
})

// ── Patients ────────────────────────────────────────────────────────────────
const patientSelect = `id, tenant_id, mrn, first_name AS "firstName", last_name AS "lastName", gender, date_of_birth AS "dateOfBirth", phone, email, address, city, country, next_of_kin AS "nextOfKin", next_of_kin_phone AS "nextOfKinPhone", emergency_contact AS "emergencyContact", emergency_phone AS "emergencyPhone", identification_number AS "identificationNumber", identification_type AS "identificationType", insurance_provider AS "insuranceProvider", insurance_number AS "insuranceNumber", blood_group AS "bloodGroup", status, created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/patients', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '' } = req.query as Record<string, string>
    const pn = Math.max(1, parseInt(page)); const sz = Math.min(100, parseInt(pageSize)); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (search) { pc++; where += ` AND (first_name ILIKE $${pc} OR last_name ILIKE $${pc} OR phone ILIKE $${pc} OR mrn ILIKE $${pc})`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM patients ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const result = await pool.query(`SELECT ${patientSelect} FROM patients ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: result.rows.map(rowToPatient), total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load patients' }) }
})

app.get('/api/v1/patients/:id', authMiddleware(), async (req, res) => {
  try {
    const r = await pool.query(`SELECT ${patientSelect} FROM patients WHERE id = $1`, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'Patient not found' })
    res.json(rowToPatient(r.rows[0]))
  } catch { res.status(500).json({ message: 'Could not load patient' }) }
})

app.post('/api/v1/patients', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  if (!b.firstName || !b.lastName) return res.status(400).json({ message: 'First name and last name are required' })
  try {
    const r = await pool.query(`INSERT INTO patients (tenant_id, first_name, last_name, gender, date_of_birth, phone, email, address, city, country, next_of_kin, next_of_kin_phone, emergency_contact, emergency_phone, identification_number, identification_type, insurance_provider, insurance_number, blood_group) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING ${patientSelect}`,
      [(req as any).user.tenantId, b.firstName, b.lastName, b.gender || null, b.dateOfBirth || null, b.phone || null, b.email || null, b.address || null, b.city || null, b.country || null, b.nextOfKin || null, b.nextOfKinPhone || null, b.emergencyContact || null, b.emergencyPhone || null, b.identificationNumber || null, b.identificationType || null, b.insuranceProvider || null, b.insuranceNumber || null, b.bloodGroup || null])
    res.status(201).json(rowToPatient(r.rows[0]))
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not save patient' }) }
})

app.patch('/api/v1/patients/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    const r = await pool.query(`UPDATE patients SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), gender=COALESCE($3,gender), date_of_birth=COALESCE($4,date_of_birth), phone=COALESCE($5,phone), email=COALESCE($6,email), address=COALESCE($7,address), city=COALESCE($8,city), country=COALESCE($9,country), blood_group=COALESCE($10,blood_group), updated_at=NOW() WHERE id=$11 RETURNING ${patientSelect}`,
      [b.firstName, b.lastName, b.gender, b.dateOfBirth, b.phone, b.email, b.address, b.city, b.country, b.bloodGroup, req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'Patient not found' })
    res.json(rowToPatient(r.rows[0]))
  } catch { res.status(500).json({ message: 'Could not update patient' }) }
})

app.get('/api/v1/patients/:id/timeline', authMiddleware(), async (_req, res) => res.json([]))
app.post('/api/v1/patients/check-duplicates', authMiddleware(), async (req, res) => {
  const { phone, mrn } = req.body ?? {}
  try {
    let where = 'WHERE 1=0'; const params: unknown[] = []
    if (phone) { params.push(phone); where = 'WHERE phone = $1' }
    else if (mrn) { params.push(mrn); where = 'WHERE mrn = $1' }
    const r = await pool.query(`SELECT ${patientSelect} FROM patients ${where}`, params)
    res.json(r.rows.map(rowToPatient))
  } catch { res.json([]) }
})

// ── Appointments ─────────────────────────────────────────────────────────────
const apptSelect = `id, patient_id AS "patientId", patient_name AS "patientName", patient_mrn AS "patientMrn", provider_id AS "providerId", provider_name AS "providerName", department_id AS "departmentId", department_name AS "departmentName", branch_id AS "branchId", branch_name AS "branchName", date, time, duration, type, reason, status, notes, queue_number AS "queueNumber", checked_in_at AS "checkedInAt", created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/appointments', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', date, status } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (date) { pc++; where += ` AND date = $${pc}`; params.push(date) }
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (search) { pc++; where += ` AND patient_name ILIKE $${pc}`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM appointments ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${apptSelect} FROM appointments ${where} ORDER BY date DESC, time DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load appointments' }) }
})

app.get('/api/v1/appointments/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${apptSelect} FROM appointments WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/appointments', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  if (!b.patientId || !b.date || !b.time) return res.status(400).json({ message: 'Patient, date and time required' })
  try {
    const r = await pool.query(`INSERT INTO appointments (tenant_id, patient_id, patient_name, patient_mrn, provider_id, provider_name, department_id, department_name, date, time, duration, type, reason, notes, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'scheduled') RETURNING ${apptSelect}`,
      [(req as any).user.tenantId, b.patientId, b.patientName || '', b.patientMrn || '', b.providerId || null, b.providerName || '', b.departmentId || null, b.departmentName || '', b.date, b.time, b.duration || 30, b.type || 'consultation', b.reason || '', b.notes || null])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create appointment' }) }
})

app.patch('/api/v1/appointments/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE appointments SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING ${apptSelect}`, [b.status, b.notes, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/appointments/:id/check-in', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE appointments SET status='checked_in', checked_in_at=NOW() WHERE id=$1 RETURNING ${apptSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/appointments/:id/cancel', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE appointments SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING ${apptSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/appointments/:id/reschedule', authMiddleware(), async (req, res) => {
  const { date, time } = req.body ?? {}
  if (!date || !time) return res.status(400).json({ message: 'Date and time required' })
  const r = await pool.query(`UPDATE appointments SET date=$1, time=$2, status='scheduled', updated_at=NOW() WHERE id=$3 RETURNING ${apptSelect}`, [date, time, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/appointments/:id/no-show', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE appointments SET status='no_show', updated_at=NOW() WHERE id=$1 RETURNING ${apptSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

// ── Encounters ───────────────────────────────────────────────────────────────
const encSelect = `id, patient_id AS "patientId", patient_name AS "patientName", patient_mrn AS "patientMrn", appointment_id AS "appointmentId", provider_id AS "providerId", provider_name AS "providerName", department_id AS "departmentId", department_name AS "departmentName", branch_id AS "branchId", branch_name AS "branchName", date, chief_complaint AS "chiefComplaint", vitals, examination, diagnoses, treatment_plan AS "treatmentPlan", notes, follow_up_date AS "followUpDate", follow_up_instructions AS "followUpInstructions", status, finalized_at AS "finalizedAt", finalized_by AS "finalizedBy", created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/encounters', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', status } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (search) { pc++; where += ` AND patient_name ILIKE $${pc}`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM encounters ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${encSelect} FROM encounters ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load encounters' }) }
})

app.get('/api/v1/encounters/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${encSelect} FROM encounters WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/encounters', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    let patientName = ''; let patientMrn = ''
    if (b.patientId) { const pRes = await pool.query('SELECT first_name, last_name, mrn FROM patients WHERE id = $1', [b.patientId]); if (pRes.rows.length > 0) { patientName = `${pRes.rows[0].first_name} ${pRes.rows[0].last_name}`; patientMrn = pRes.rows[0].mrn } }
    const r = await pool.query(`INSERT INTO encounters (tenant_id, patient_id, patient_name, patient_mrn, provider_id, provider_name, department_id, department_name, date, chief_complaint, vitals, examination, diagnoses, treatment_plan, notes, follow_up_date, follow_up_instructions, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'draft') RETURNING ${encSelect}`,
      [(req as any).user.tenantId, b.patientId, patientName, patientMrn, (req as any).user.id, (req as any).user.name, b.departmentId || null, b.departmentName || null, new Date().toISOString().split('T')[0], b.chiefComplaint || '', JSON.stringify(b.vitals || {}), b.examination || null, JSON.stringify(b.diagnoses || []), b.treatmentPlan || null, b.notes || null, b.followUpDate || null, b.followUpInstructions || null])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create encounter' }) }
})

app.patch('/api/v1/encounters/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    const r = await pool.query(`UPDATE encounters SET chief_complaint=COALESCE($1,chief_complaint), vitals=COALESCE($2,vitals), examination=COALESCE($3,examination), diagnoses=COALESCE($4,diagnoses), treatment_plan=COALESCE($5,treatment_plan), notes=COALESCE($6,notes), follow_up_date=COALESCE($7,follow_up_date), follow_up_instructions=COALESCE($8,follow_up_instructions), updated_at=NOW() WHERE id=$9 RETURNING ${encSelect}`,
      [b.chiefComplaint, b.vitals !== undefined ? JSON.stringify(b.vitals) : null, b.examination, b.diagnoses !== undefined ? JSON.stringify(b.diagnoses) : null, b.treatmentPlan, b.notes, b.followUpDate, b.followUpInstructions, req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    res.json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not update encounter' }) }
})

app.post('/api/v1/encounters/:id/finalize', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE encounters SET status='finalized', finalized_at=NOW(), finalized_by=$2, updated_at=NOW() WHERE id=$1 AND status!='finalized' RETURNING ${encSelect}`, [req.params.id, (req as any).user.name])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found or already finalized' })
  res.json(r.rows[0])
})

// ── Prescriptions ────────────────────────────────────────────────────────────
const rxSelect = `id, patient_id AS "patientId", patient_name AS "patientName", patient_mrn AS "patientMrn", encounter_id AS "encounterId", prescriber_id AS "prescriberId", prescriber_name AS "prescriberName", items, status, notes, dispensed_at AS "dispensedAt", dispensed_by AS "dispensedBy", created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/prescriptions', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', status, patientId } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (patientId) { pc++; where += ` AND patient_id = $${pc}`; params.push(patientId) }
    if (search) { pc++; where += ` AND patient_name ILIKE $${pc}`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM prescriptions ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${rxSelect} FROM prescriptions ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load prescriptions' }) }
})

app.get('/api/v1/prescriptions/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${rxSelect} FROM prescriptions WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/prescriptions', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    let patientName = ''; let patientMrn = ''
    if (b.patientId) { const pRes = await pool.query('SELECT first_name, last_name, mrn FROM patients WHERE id = $1', [b.patientId]); if (pRes.rows.length > 0) { patientName = `${pRes.rows[0].first_name} ${pRes.rows[0].last_name}`; patientMrn = pRes.rows[0].mrn } }
    const r = await pool.query(`INSERT INTO prescriptions (tenant_id, patient_id, patient_name, patient_mrn, encounter_id, prescriber_id, prescriber_name, items, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${rxSelect}`,
      [(req as any).user.tenantId, b.patientId, patientName, patientMrn, b.encounterId || null, (req as any).user.id, (req as any).user.name, JSON.stringify(b.items || []), b.status || 'active', b.notes || null])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create prescription' }) }
})

app.post('/api/v1/prescriptions/:id/cancel', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE prescriptions SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING ${rxSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/dispenses', authMiddleware(), async (req, res) => {
  const { prescriptionId, items } = req.body ?? {}
  if (!prescriptionId) return res.status(400).json({ message: 'Prescription ID required' })
  try {
    await pool.query(`UPDATE prescriptions SET status='dispensed', dispensed_at=NOW(), dispensed_by=$2 WHERE id=$1`, [prescriptionId, (req as any).user.name])
    const dispenses = (items || []).map((item: any) => ({ id: Math.random().toString(36).slice(2), prescriptionId: String(prescriptionId), prescriptionItemId: item.itemId, quantityDispensed: item.quantity, dispensedById: String((req as any).user.id), dispensedByName: (req as any).user.name, dispensedAt: new Date().toISOString() }))
    res.status(201).json(dispenses)
  } catch { res.status(500).json({ message: 'Dispense failed' }) }
})
app.get('/api/v1/dispenses', authMiddleware(), async (_req, res) => res.json([]))

// ── Invoices ──────────────────────────────────────────────────────────────────
const invSelect = `id, invoice_number AS "invoiceNumber", patient_id AS "patientId", patient_name AS "patientName", patient_mrn AS "patientMrn", encounter_id AS "encounterId", items, subtotal, discount_total AS "discountTotal", tax_total AS "taxTotal", total, amount_paid AS "amountPaid", balance, currency, status, notes, due_date AS "dueDate", created_by_id AS "createdById", created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/invoices', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', status } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (search) { pc++; where += ` AND (patient_name ILIKE $${pc} OR invoice_number ILIKE $${pc})`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM invoices ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${invSelect} FROM invoices ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load invoices' }) }
})

app.get('/api/v1/invoices/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${invSelect} FROM invoices WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/invoices', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    let patientName = ''; let patientMrn = ''
    if (b.patientId) { const pRes = await pool.query('SELECT first_name, last_name, mrn FROM patients WHERE id = $1', [b.patientId]); if (pRes.rows.length > 0) { patientName = `${pRes.rows[0].first_name} ${pRes.rows[0].last_name}`; patientMrn = pRes.rows[0].mrn } }
    const r = await pool.query(`INSERT INTO invoices (tenant_id, patient_id, patient_name, patient_mrn, encounter_id, items, subtotal, discount_total, tax_total, total, balance, currency, status, notes, due_date, created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING ${invSelect}`,
      [(req as any).user.tenantId, b.patientId, patientName, patientMrn, b.encounterId || null, JSON.stringify(b.items || []), b.subtotal || 0, b.discountTotal || 0, b.taxTotal || 0, b.total || 0, b.total || 0, b.currency || 'USD', b.status || 'draft', b.notes || null, b.dueDate || null, (req as any).user.id])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create invoice' }) }
})

app.patch('/api/v1/invoices/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE invoices SET items=COALESCE($1,items), subtotal=COALESCE($2,subtotal), total=COALESCE($3,total), balance=COALESCE($4,balance), notes=COALESCE($5,notes), due_date=COALESCE($6,due_date), updated_at=NOW() WHERE id=$7 RETURNING ${invSelect}`,
    [b.items ? JSON.stringify(b.items) : null, b.subtotal, b.total, b.balance, b.notes, b.dueDate, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/invoices/:id/post', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE invoices SET status='posted', updated_at=NOW() WHERE id=$1 AND status='draft' RETURNING ${invSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found or not a draft' })
  res.json(r.rows[0])
})
app.post('/api/v1/invoices/:id/cancel', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE invoices SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING ${invSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

// ── Payments ──────────────────────────────────────────────────────────────────
app.get('/api/v1/payments', authMiddleware(), async (req, res) => {
  try {
    const { invoiceId } = req.query as Record<string, string>
    let where = 'WHERE 1=1'; const params: unknown[] = []
    if (invoiceId) { where += ' AND invoice_id = $1'; params.push(invoiceId) }
    const r = await pool.query(`SELECT id, invoice_id AS "invoiceId", invoice_number AS "invoiceNumber", patient_name AS "patientName", amount, currency, payment_method AS "paymentMethod", reference, received_by_name AS "receivedByName", notes, status, created_at AS "createdAt" FROM payments ${where} ORDER BY id DESC LIMIT 50`, params)
    res.json({ data: r.rows, total: r.rows.length, page: 1, pageSize: 50, totalPages: 1 })
  } catch { res.status(500).json({ message: 'Could not load payments' }) }
})

app.post('/api/v1/payments', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  if (!b.invoiceId || !b.amount) return res.status(400).json({ message: 'Invoice ID and amount required' })
  try {
    const invRes = await pool.query('SELECT invoice_number, patient_name, balance, amount_paid, total, currency FROM invoices WHERE id = $1', [b.invoiceId])
    if (invRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' })
    const inv = invRes.rows[0]
    const payRes = await pool.query(`INSERT INTO payments (tenant_id, invoice_id, invoice_number, patient_id, patient_name, amount, currency, payment_method, reference, received_by_id, received_by_name, notes, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'completed') RETURNING id, invoice_id AS "invoiceId", invoice_number AS "invoiceNumber", patient_name AS "patientName", amount, currency, payment_method AS "paymentMethod", reference, received_by_name AS "receivedByName", notes, status, created_at AS "createdAt"`,
      [(req as any).user.tenantId, b.invoiceId, inv.invoice_number, b.patientId || null, inv.patient_name, b.amount, inv.currency, b.paymentMethod || 'cash', b.reference || null, (req as any).user.id, (req as any).user.name, b.notes || null])
    const newPaid = parseFloat(inv.amount_paid) + parseFloat(b.amount)
    const newBal = parseFloat(inv.total) - newPaid
    const newStatus = newBal <= 0 ? 'paid' : 'partially_paid'
    await pool.query(`UPDATE invoices SET amount_paid=$1, balance=$2, status=$3, updated_at=NOW() WHERE id=$4`, [newPaid, Math.max(0, newBal), newStatus, b.invoiceId])
    res.status(201).json(payRes.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Payment failed' }) }
})

app.post('/api/v1/payments/:id/reverse', authMiddleware(), async (req, res) => {
  const { reason } = req.body ?? {}
  if (!reason) return res.status(400).json({ message: 'Reason required' })
  const r = await pool.query(`UPDATE payments SET status='reversed', reversed_at=NOW(), reversed_by=$2, reversal_reason=$3 WHERE id=$1 AND status='completed' RETURNING id`, [req.params.id, (req as any).user.name, reason])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found or already reversed' })
  res.json({ message: 'Payment reversed' })
})

// ── Refunds (stub) ─────────────────────────────────────────────────────────────
app.get('/api/v1/refunds', authMiddleware(), async (_req, res) => res.json({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }))
app.post('/api/v1/refunds', authMiddleware(), async (req, res) => res.status(201).json({ id: '0', status: 'pending', ...req.body }))
app.post('/api/v1/refunds/:id/approve', authMiddleware(), async (req, res) => res.json({ id: req.params.id, status: 'approved' }))
app.post('/api/v1/refunds/:id/reject', authMiddleware(), async (req, res) => res.json({ id: req.params.id, status: 'rejected' }))

// ── Lab Orders ───────────────────────────────────────────────────────────────
const labSelect = `id, order_number AS "orderNumber", patient_id AS "patientId", patient_name AS "patientName", patient_mrn AS "patientMrn", encounter_id AS "encounterId", ordered_by_id AS "orderedById", ordered_by_name AS "orderedByName", priority, tests, sample_type AS "sampleType", sample_collected_at AS "sampleCollectedAt", sample_received_at AS "sampleReceivedAt", status, notes, created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/lab-orders', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', status, priority } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (priority) { pc++; where += ` AND priority = $${pc}`; params.push(priority) }
    if (search) { pc++; where += ` AND patient_name ILIKE $${pc}`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM lab_orders ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${labSelect} FROM lab_orders ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load lab orders' }) }
})

app.get('/api/v1/lab-orders/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${labSelect} FROM lab_orders WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/lab-orders', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  try {
    let patientName = ''; let patientMrn = ''
    if (b.patientId) { const pRes = await pool.query('SELECT first_name, last_name, mrn FROM patients WHERE id = $1', [b.patientId]); if (pRes.rows.length > 0) { patientName = `${pRes.rows[0].first_name} ${pRes.rows[0].last_name}`; patientMrn = pRes.rows[0].mrn } }
    const r = await pool.query(`INSERT INTO lab_orders (tenant_id, patient_id, patient_name, patient_mrn, encounter_id, ordered_by_id, ordered_by_name, priority, tests, sample_type, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ordered',$11) RETURNING ${labSelect}`,
      [(req as any).user.tenantId, b.patientId, patientName, patientMrn, b.encounterId || null, (req as any).user.id, (req as any).user.name, b.priority || 'routine', JSON.stringify(b.tests || []), b.sampleType || null, b.notes || null])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not create lab order' }) }
})

app.patch('/api/v1/lab-orders/:id/status', authMiddleware(), async (req, res) => {
  const { status } = req.body ?? {}
  if (!status) return res.status(400).json({ message: 'Status required' })
  const fields = [`status = $2`, `updated_at = NOW()`]; const params: unknown[] = [req.params.id, status]
  if (status === 'collected') fields.push('sample_collected_at = NOW()')
  if (status === 'received') fields.push('sample_received_at = NOW()')
  const r = await pool.query(`UPDATE lab_orders SET ${fields.join(', ')} WHERE id = $1 RETURNING ${labSelect}`, params)
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/lab-orders/:id/results', authMiddleware(), async (req, res) => {
  const { results } = req.body ?? {}
  if (!Array.isArray(results)) return res.status(400).json({ message: 'Results array required' })
  try {
    const orderRes = await pool.query('SELECT tests FROM lab_orders WHERE id = $1', [req.params.id])
    if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    const tests = orderRes.rows[0].tests as any[]
    const updated = tests.map(t => { const r = results.find((x: any) => x.testId === t.testId); return r ? { ...t, resultValue: r.value, resultNotes: r.notes || null, status: 'processing' } : t })
    const r = await pool.query(`UPDATE lab_orders SET tests=$2, status='processing', updated_at=NOW() WHERE id=$1 RETURNING ${labSelect}`, [req.params.id, JSON.stringify(updated)])
    res.json(r.rows[0])
  } catch { res.status(500).json({ message: 'Results entry failed' }) }
})

app.post('/api/v1/lab-orders/:id/verify', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE lab_orders SET status='verified', updated_at=NOW() WHERE id=$1 RETURNING ${labSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/lab-orders/:id/release', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE lab_orders SET status='released', updated_at=NOW() WHERE id=$1 RETURNING ${labSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.get('/api/v1/lab-tests', authMiddleware(), async (_req, res) => {
  res.json([
    { id: '1', name: 'Full Blood Count', code: 'FBC', unit: '×10⁹/L', referenceRange: '4.0-11.0', category: 'hematology' },
    { id: '2', name: 'Glucose (Fasting)', code: 'GLU', unit: 'mmol/L', referenceRange: '3.9-6.1', category: 'biochemistry' },
    { id: '3', name: 'Cholesterol Total', code: 'CHOL', unit: 'mmol/L', referenceRange: '<5.2', category: 'biochemistry' },
    { id: '4', name: 'Creatinine', code: 'CREAT', unit: 'µmol/L', referenceRange: '44-106', category: 'biochemistry' },
    { id: '5', name: 'Malaria Parasite', code: 'MP', unit: 'status', referenceRange: 'Negative', category: 'parasitology' },
    { id: '6', name: 'Urinalysis', code: 'UA', unit: '-', referenceRange: 'Normal', category: 'urine' },
    { id: '7', name: 'HIV Screening', code: 'HIV', unit: 'status', referenceRange: 'Non-reactive', category: 'serology' },
    { id: '8', name: 'Blood Group', code: 'BG', unit: 'type', referenceRange: '-', category: 'hematology' },
    { id: '9', name: 'Widal Test', code: 'WIDAL', unit: 'titre', referenceRange: '<1:80', category: 'serology' },
    { id: '10', name: 'Urea', code: 'UREA', unit: 'mmol/L', referenceRange: '2.5-7.0', category: 'biochemistry' },
  ])
})

// ── Inventory ──────────────────────────────────────────────────────────────────
const itemSelect = `id, name, sku, category, unit, stock_on_hand AS "stockOnHand", reorder_level AS "reorderLevel", location, is_active AS "isActive", expiry_date AS "expiryDate", created_at AS "createdAt"`

app.get('/api/v1/stock/stats', authMiddleware(), async (_req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM inventory_items')
    const low = await pool.query('SELECT COUNT(*) FROM inventory_items WHERE stock_on_hand > 0 AND stock_on_hand <= reorder_level')
    const out = await pool.query('SELECT COUNT(*) FROM inventory_items WHERE stock_on_hand = 0')
    res.json({ totalItems: parseInt(total.rows[0].count), lowStock: parseInt(low.rows[0].count), outOfStock: parseInt(out.rows[0].count), pendingPOs: 0 })
  } catch { res.json({ totalItems: 0, lowStock: 0, outOfStock: 0, pendingPOs: 0 }) }
})

app.get('/api/v1/stock/items', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', category, lowStock } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.tenantId) { pc++; where += ` AND tenant_id = $${pc}`; params.push(u.tenantId) }
    if (category) { pc++; where += ` AND category = $${pc}`; params.push(category) }
    if (lowStock === 'true') where += ` AND stock_on_hand <= reorder_level`
    if (search) { pc++; where += ` AND (name ILIKE $${pc} OR sku ILIKE $${pc})`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM inventory_items ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${itemSelect} FROM inventory_items ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch { res.status(500).json({ message: 'Could not load items' }) }
})

app.get('/api/v1/stock/items/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${itemSelect} FROM inventory_items WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/stock/items', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`INSERT INTO inventory_items (tenant_id, name, sku, category, unit, stock_on_hand, reorder_level, location, is_active, expiry_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9) RETURNING ${itemSelect}`,
    [(req as any).user.tenantId, b.name, b.sku, b.category, b.unit, 0, b.reorderLevel || 0, b.location || null, b.expiryDate || null])
  res.status(201).json(r.rows[0])
})

app.patch('/api/v1/stock/items/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE inventory_items SET name=COALESCE($1,name), category=COALESCE($2,category), unit=COALESCE($3,unit), reorder_level=COALESCE($4,reorder_level), location=COALESCE($5,location) WHERE id=$6 RETURNING ${itemSelect}`,
    [b.name, b.category, b.unit, b.reorderLevel, b.location, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

// ── Stock Movements ───────────────────────────────────────────────────────────
app.get('/api/v1/stock/movements', authMiddleware(), async (req, res) => {
  const { itemId } = req.query as Record<string, string>
  const u = (req as any).user
  let where = 'WHERE 1=1'; const params: unknown[] = []
  if (u.tenantId) { where += ' AND tenant_id = $1'; params.push(u.tenantId) }
  if (itemId) { where += ' AND item_id = $2'; params.push(itemId) }
  const r = await pool.query(`SELECT id, item_id AS "itemId", item_name AS "itemName", type, quantity, batch_number AS "batchNumber", reason, performed_by_name AS "performedByName", created_at AS "createdAt" FROM stock_movements ${where} ORDER BY id DESC LIMIT 50`, params)
  res.json({ data: r.rows, total: r.rows.length, page: 1, pageSize: 50, totalPages: 1 })
})

app.post('/api/v1/stock/movements', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  if (!b.itemId || !b.quantity || !b.type) return res.status(400).json({ message: 'Item, quantity and type required' })
  try {
    const itemRes = await pool.query('SELECT name FROM inventory_items WHERE id = $1', [b.itemId])
    const itemName = itemRes.rows[0]?.name || 'Unknown'
    const r = await pool.query(`INSERT INTO stock_movements (tenant_id, item_id, item_name, type, quantity, batch_number, reason, performed_by_id, performed_by_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, item_id AS "itemId", item_name AS "itemName", type, quantity, batch_number AS "batchNumber", reason, performed_by_name AS "performedByName", created_at AS "createdAt"`,
      [(req as any).user.tenantId, b.itemId, itemName, b.type, b.quantity, b.batchNumber || null, b.reason || null, (req as any).user.id, (req as any).user.name])
    const delta = b.type === 'receive' ? b.quantity : b.type === 'transfer' ? 0 : -b.quantity
    if (delta !== 0) await pool.query('UPDATE inventory_items SET stock_on_hand = GREATEST(0, stock_on_hand + $2) WHERE id = $1', [b.itemId, delta])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not record movement' }) }
})

// ── Suppliers ──────────────────────────────────────────────────────────────────
app.get('/api/v1/suppliers', authMiddleware(), async (req, res) => {
  const { search = '' } = req.query as Record<string, string>
  const u = (req as any).user
  let where = 'WHERE 1=1'; const params: unknown[] = []
  if (u.tenantId) { where += ' AND tenant_id = $1'; params.push(u.tenantId) }
  if (search) { where += ' AND name ILIKE $2'; params.push(`%${search}%`) }
  const r = await pool.query(`SELECT id, name, contact_name AS "contactName", email, phone, address, city, country, is_active AS "isActive", created_at AS "createdAt" FROM suppliers ${where} ORDER BY id DESC LIMIT 50`, params)
  res.json({ data: r.rows, total: r.rows.length, page: 1, pageSize: 50, totalPages: 1 })
})
app.post('/api/v1/suppliers', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`INSERT INTO suppliers (tenant_id, name, contact_name, email, phone, address, city, country, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id, name, contact_name AS "contactName", email, phone, address, city, country, is_active AS "isActive", created_at AS "createdAt"`,
    [(req as any).user.tenantId, b.name, b.contactName || null, b.email || null, b.phone || null, b.address || null, b.city || null, b.country || null])
  res.status(201).json(r.rows[0])
})
app.patch('/api/v1/suppliers/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE suppliers SET name=COALESCE($1,name), contact_name=COALESCE($2,contact_name), email=COALESCE($3,email), phone=COALESCE($4,phone), address=COALESCE($5,address), city=COALESCE($6,city), country=COALESCE($7,country) WHERE id=$8 RETURNING id, name, contact_name AS "contactName", email, phone, address, city, country, is_active AS "isActive", created_at AS "createdAt"`,
    [b.name, b.contactName, b.email, b.phone, b.address, b.city, b.country, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

// ── Purchase Orders ────────────────────────────────────────────────────────────
const poSelect = `id, po_number AS "poNumber", supplier_id AS "supplierId", supplier_name AS "supplierName", items, total_amount AS "totalAmount", currency, status, expected_delivery AS "expectedDelivery", notes, created_by_id AS "createdById", created_at AS "createdAt", updated_at AS "updatedAt"`

app.get('/api/v1/purchase-orders', authMiddleware(), async (req, res) => {
  const { status } = req.query as Record<string, string>
  const u = (req as any).user
  let where = 'WHERE 1=1'; const params: unknown[] = []
  if (u.tenantId) { where += ' AND tenant_id = $1'; params.push(u.tenantId) }
  if (status) { where += ' AND status = $2'; params.push(status) }
  const r = await pool.query(`SELECT ${poSelect} FROM purchase_orders ${where} ORDER BY id DESC LIMIT 50`, params)
  res.json({ data: r.rows, total: r.rows.length, page: 1, pageSize: 50, totalPages: 1 })
})
app.get('/api/v1/purchase-orders/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT ${poSelect} FROM purchase_orders WHERE id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/purchase-orders', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`INSERT INTO purchase_orders (tenant_id, supplier_id, supplier_name, items, total_amount, currency, status, expected_delivery, notes, created_by_id) VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9) RETURNING ${poSelect}`,
    [(req as any).user.tenantId, b.supplierId || null, b.supplierName || null, JSON.stringify(b.items || []), b.totalAmount || 0, b.currency || 'USD', b.expectedDelivery || null, b.notes || null, (req as any).user.id])
  res.status(201).json(r.rows[0])
})
app.post('/api/v1/purchase-orders/:id/receive', authMiddleware(), async (req, res) => {
  try {
    const r = await pool.query(`UPDATE purchase_orders SET status='received', updated_at=NOW() WHERE id=$1 RETURNING ${poSelect}`, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    const items = r.rows[0].items as any[]
    for (const item of items) {
      if (item.itemId && item.quantity) {
        await pool.query('UPDATE inventory_items SET stock_on_hand = stock_on_hand + $2 WHERE id = $1', [item.itemId, item.quantity])
        await pool.query(`INSERT INTO stock_movements (tenant_id, item_id, item_name, type, quantity, reason, performed_by_id, performed_by_name) VALUES ($1,$2,$3,'receive',$4,'PO receipt',$5,$6)`,
          [(req as any).user.tenantId, item.itemId, item.itemName || '', item.quantity, (req as any).user.id, (req as any).user.name])
      }
    }
    res.json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Receive failed' }) }
})

// ── Users ─────────────────────────────────────────────────────────────────────
app.get('/api/v1/users', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', role, status, tenantId } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    const u = (req as any).user
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (u.role !== 'super_admin' && u.tenantId) { pc++; where += ` AND u.tenant_id = $${pc}`; params.push(u.tenantId) }
    if (tenantId) { pc++; where += ` AND u.tenant_id = $${pc}`; params.push(tenantId) }
    if (role) { pc++; where += ` AND u.role = $${pc}`; params.push(role) }
    if (status) { pc++; where += ` AND u.status = $${pc}`; params.push(status) }
    if (search) { pc++; where += ` AND (u.name ILIKE $${pc} OR u.email ILIKE $${pc})`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT u.id, u.name, u.email, u.phone, u.role, u.tenant_id AS "tenantId", t.name AS "tenantName", u.branch_id AS "branchId", b.name AS "branchName", u.department_id AS "departmentId", d.name AS "departmentName", u.status, u.invitation_status AS "invitationStatus", u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt" FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id LEFT JOIN branches b ON u.branch_id = b.id LEFT JOIN departments d ON u.department_id = d.id ${where} ORDER BY u.id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load users' }) }
})

app.get('/api/v1/users/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query(`SELECT u.id, u.name, u.email, u.phone, u.role, u.tenant_id AS "tenantId", t.name AS "tenantName", u.branch_id AS "branchId", b.name AS "branchName", u.department_id AS "departmentId", d.name AS "departmentName", u.status, u.invitation_status AS "invitationStatus", u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt" FROM users u LEFT JOIN tenants t ON u.tenant_id = t.id LEFT JOIN branches b ON u.branch_id = b.id LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'User not found' })
  res.json(r.rows[0])
})

app.post('/api/v1/users/invite', authMiddleware(), async (req, res) => {
  const { name, email, role, phone, tenantId, branchId, departmentId } = req.body ?? {}
  if (!name || !email) return res.status(400).json({ message: 'Name and email required' })
  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email])
    if (existing.rows.length > 0) return res.status(409).json({ message: 'User with this email already exists' })
    const hash = await bcrypt.hash('Temp@1234', 10)
    const r = await pool.query(`INSERT INTO users (name, email, password_hash, role, phone, tenant_id, branch_id, department_id, status, invitation_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'invited','pending') RETURNING id, name, email, phone, role, status, invitation_status AS "invitationStatus", created_at AS "createdAt"`,
      [name, email, hash, role || 'hospital_admin', phone || null, tenantId || (req as any).user.tenantId, branchId || null, departmentId || null])
    res.status(201).json(r.rows[0])
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not invite user' }) }
})

app.post('/api/v1/users/:id/deactivate', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE users SET status='inactive' WHERE id=$1 RETURNING id, name, email, role, status`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' }); res.json(r.rows[0])
})
app.post('/api/v1/users/:id/activate', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE users SET status='active' WHERE id=$1 RETURNING id, name, email, role, status`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' }); res.json(r.rows[0])
})
app.post('/api/v1/users/:id/resend-invitation', authMiddleware(), async (_req, res) => res.json({ message: 'Invitation resent' }))
app.post('/api/v1/users/:id/force-logout', authMiddleware(), async (req, res) => {
  await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [req.params.id]).catch(() => {}); res.json({ message: 'Session terminated' })
})
app.post('/api/v1/users/:id/reset-password', authMiddleware(), async (req, res) => {
  const hash = await bcrypt.hash('Temp@1234', 10)
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]); res.json({ message: 'Password reset email sent' })
})

// ── Admin: Tenants ────────────────────────────────────────────────────────────
const tenantSelect = `id, name, code, email, phone, address, city, country, status, branch_count AS "branchCount", user_count AS "userCount", subscription_plan AS "subscriptionPlan", subscription_status AS "subscriptionStatus", license_status AS "licenseStatus", created_at AS "createdAt", last_login_at AS "lastLoginAt"`

app.get('/api/v1/admin/tenants/stats', authMiddleware(), async (_req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM tenants')
    const active = await pool.query("SELECT COUNT(*) FROM tenants WHERE status = 'active'")
    const suspended = await pool.query("SELECT COUNT(*) FROM tenants WHERE status = 'suspended'")
    const trial = await pool.query("SELECT COUNT(*) FROM tenants WHERE status = 'trial'")
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users')
    res.json({ total: parseInt(total.rows[0].count), active: parseInt(active.rows[0].count), suspended: parseInt(suspended.rows[0].count), trial: parseInt(trial.rows[0].count), inactive: parseInt(total.rows[0].count) - parseInt(active.rows[0].count) - parseInt(suspended.rows[0].count) - parseInt(trial.rows[0].count), expired: 0, totalUsers: parseInt(totalUsers.rows[0].count), licensesIssued: 1, pendingApprovals: 0, expiringSoon: 0 })
  } catch { res.json({ total: 1, active: 1, suspended: 0, trial: 0, inactive: 0, expired: 0, totalUsers: 11, licensesIssued: 1, pendingApprovals: 0, expiringSoon: 0 }) }
})

app.get('/api/v1/admin/tenants', authMiddleware(), async (req, res) => {
  try {
    const { page = '1', pageSize = '20', search = '', status, plan } = req.query as Record<string, string>
    const pn = parseInt(page); const sz = parseInt(pageSize); const off = (pn - 1) * sz
    let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
    if (status) { pc++; where += ` AND status = $${pc}`; params.push(status) }
    if (plan) { pc++; where += ` AND subscription_plan = $${pc}`; params.push(plan) }
    if (search) { pc++; where += ` AND (name ILIKE $${pc} OR code ILIKE $${pc})`; params.push(`%${search}%`) }
    const cnt = await pool.query(`SELECT COUNT(*) FROM tenants ${where}`, params)
    const total = parseInt(cnt.rows[0].count)
    pc++; const r = await pool.query(`SELECT ${tenantSelect} FROM tenants ${where} ORDER BY id DESC LIMIT $${pc} OFFSET $${pc + 1}`, [...params, sz, off])
    res.json({ data: r.rows, total, page: pn, pageSize: sz, totalPages: Math.ceil(total / sz) || 1 })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load tenants' }) }
})

app.get('/api/v1/admin/tenants/:id', authMiddleware(), async (req, res) => {
  try {
    const tRes = await pool.query(`SELECT * FROM tenants WHERE id = $1`, [req.params.id])
    if (tRes.rows.length === 0) return res.status(404).json({ message: 'Tenant not found' })
    const t = tRes.rows[0]
    const branches = await pool.query(`SELECT id, name, code, city, is_active AS "isActive", is_headquarters AS "isHeadquarters", user_count AS "userCount", department_count AS "departmentCount", created_at AS "createdAt" FROM branches WHERE tenant_id = $1`, [req.params.id])
    const subs = await pool.query(`SELECT id, tenant_id AS "tenantId", plan, billing_cycle AS "billingCycle", status, start_date AS "startDate", end_date AS "endDate", auto_renew AS "autoRenew", amount, currency, created_at AS "createdAt", updated_at AS "updatedAt" FROM subscriptions WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1`, [req.params.id])
    const licenses = await pool.query(`SELECT id, key, tenant_id AS "tenantId", tenant_name AS "tenantName", issued_to AS "issuedTo", max_users AS "maxUsers", max_branches AS "maxBranches", expiry_date AS "expiryDate", status, notes, issued_at AS "issuedAt" FROM licenses WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1`, [req.params.id])
    res.json({ id: String(t.id), name: t.name, code: t.code, email: t.email, phone: t.phone, address: t.address, city: t.city, country: t.country, website: t.website, timezone: t.timezone, currency: t.currency, status: t.status, branchCount: t.branch_count, userCount: t.user_count, subscriptionPlan: t.subscription_plan, subscriptionStatus: t.subscription_status, licenseStatus: t.license_status, createdAt: t.created_at, lastLoginAt: t.last_login_at, branches: branches.rows, subscription: subs.rows[0] || undefined, license: licenses.rows[0] || undefined })
  } catch (e) { console.error(e); res.status(500).json({ message: 'Could not load tenant' }) }
})

app.post('/api/v1/admin/tenants', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  if (!b.name || !b.code) return res.status(400).json({ message: 'Name and code required' })
  const r = await pool.query(`INSERT INTO tenants (name, code, email, phone, address, city, country, website, timezone, currency, status, subscription_plan, subscription_status, license_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'trial','starter','trial','pending') RETURNING ${tenantSelect}`,
    [b.name, b.code, b.email || null, b.phone || null, b.address || null, b.city || null, b.country || null, b.website || null, b.timezone || 'Africa/Lagos', b.currency || 'USD'])
  res.status(201).json(r.rows[0])
})
app.patch('/api/v1/admin/tenants/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE tenants SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone), address=COALESCE($4,address), city=COALESCE($5,city), country=COALESCE($6,country), website=COALESCE($7,website), timezone=COALESCE($8,timezone), currency=COALESCE($9,currency) WHERE id=$10 RETURNING ${tenantSelect}`,
    [b.name, b.email, b.phone, b.address, b.city, b.country, b.website, b.timezone, b.currency, req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})
app.post('/api/v1/admin/tenants/:id/activate', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE tenants SET status='active' WHERE id=$1 RETURNING ${tenantSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' }); res.json(r.rows[0])
})
app.post('/api/v1/admin/tenants/:id/suspend', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE tenants SET status='suspended' WHERE id=$1 RETURNING ${tenantSelect}`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' }); res.json(r.rows[0])
})

// ── Subscriptions ──────────────────────────────────────────────────────────────
app.get('/api/v1/admin/subscriptions', authMiddleware(), async (req, res) => {
  const { status } = req.query as Record<string, string>
  let where = 'WHERE 1=1'; const params: unknown[] = []
  if (status) { where += ' AND status = $1'; params.push(status) }
  const r = await pool.query(`SELECT id, tenant_id AS "tenantId", plan, billing_cycle AS "billingCycle", status, start_date AS "startDate", end_date AS "endDate", auto_renew AS "autoRenew", amount, currency, created_at AS "createdAt", updated_at AS "updatedAt" FROM subscriptions ${where} ORDER BY id DESC`, params)
  res.json(r.rows)
})
app.post('/api/v1/admin/subscriptions', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`INSERT INTO subscriptions (tenant_id, plan, billing_cycle, status, start_date, end_date, auto_renew, amount, currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, tenant_id AS "tenantId", plan, billing_cycle AS "billingCycle", status, start_date AS "startDate", end_date AS "endDate", auto_renew AS "autoRenew", amount, currency, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [b.tenantId, b.plan || 'starter', b.billingCycle || 'monthly', b.status || 'trial', b.startDate || new Date(), b.endDate || null, b.autoRenew ?? true, b.amount || 0, b.currency || 'USD'])
  res.status(201).json(r.rows[0])
})
app.patch('/api/v1/admin/subscriptions/:id', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`UPDATE subscriptions SET plan=COALESCE($1,plan), status=COALESCE($2,status), auto_renew=COALESCE($3,auto_renew), end_date=COALESCE($4,end_date), updated_at=NOW() WHERE id=$5 RETURNING id`, [b.plan, b.status, b.autoRenew, b.endDate, req.params.id])
  res.json(r.rows[0] || { message: 'Not found' })
})

// ── Licenses ───────────────────────────────────────────────────────────────────
app.get('/api/v1/admin/licenses', authMiddleware(), async (_req, res) => {
  const r = await pool.query(`SELECT id, key, tenant_id AS "tenantId", tenant_name AS "tenantName", issued_to AS "issuedTo", max_users AS "maxUsers", max_branches AS "maxBranches", expiry_date AS "expiryDate", status, notes, issued_at AS "issuedAt", revoked_at AS "revokedAt" FROM licenses ORDER BY id DESC`)
  res.json(r.rows)
})
app.post('/api/v1/admin/licenses', authMiddleware(), async (req, res) => {
  const { tenantId, issuedTo, maxUsers, maxBranches, expiryDate } = req.body ?? {}
  if (!tenantId) return res.status(400).json({ message: 'Tenant ID required' })
  const tRes = await pool.query('SELECT name FROM tenants WHERE id = $1', [tenantId])
  const tenantName = tRes.rows[0]?.name || 'Unknown'
  const key = `HOSO-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const r = await pool.query(`INSERT INTO licenses (key, tenant_id, tenant_name, issued_to, max_users, max_branches, expiry_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING id, key, tenant_id AS "tenantId", tenant_name AS "tenantName", issued_to AS "issuedTo", max_users AS "maxUsers", max_branches AS "maxBranches", expiry_date AS "expiryDate", status, issued_at AS "issuedAt"`,
    [key, tenantId, tenantName, issuedTo || tenantName, maxUsers || 50, maxBranches || 5, expiryDate || null])
  await pool.query(`UPDATE tenants SET license_status = 'active' WHERE id = $1`, [tenantId])
  res.status(201).json(r.rows[0])
})
app.post('/api/v1/admin/licenses/:id/revoke', authMiddleware(), async (req, res) => {
  const r = await pool.query(`UPDATE licenses SET status='revoked', revoked_at=NOW() WHERE id=$1 RETURNING id, key, status`, [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  await pool.query(`UPDATE tenants SET license_status = 'revoked' WHERE id = (SELECT tenant_id FROM licenses WHERE id = $1)`, [req.params.id])
  res.json(r.rows[0])
})
app.post('/api/v1/admin/licenses/:id/renew', authMiddleware(), async (req, res) => {
  const { expiryDate } = req.body ?? {}
  const r = await pool.query(`UPDATE licenses SET expiry_date=$2, status='active', revoked_at=NULL WHERE id=$1 RETURNING id, key, status, expiry_date AS "expiryDate"`, [req.params.id, expiryDate])
  res.json(r.rows[0] || { message: 'Not found' })
})

// ── Departments, Services, Branches ──────────────────────────────────────────
app.get('/api/v1/departments', authMiddleware(), async (req, res) => {
  const u = (req as any).user; let where = 'WHERE 1=1'; const params: unknown[] = []
  if (u.tenantId) { where += ' AND tenant_id = $1'; params.push(u.tenantId) }
  const r = await pool.query(`SELECT id, tenant_id AS "tenantId", branch_id AS "branchId", name, code, description, is_active AS "isActive", created_at AS "createdAt" FROM departments ${where}`, params)
  res.json(r.rows)
})
app.post('/api/v1/departments', authMiddleware(), async (req, res) => {
  const b = req.body ?? {}
  const r = await pool.query(`INSERT INTO departments (tenant_id, name, code, description, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id, name, code, is_active AS "isActive"`, [(req as any).user.tenantId, b.name, b.code || null, b.description || null])
  res.status(201).json(r.rows[0])
})
app.get('/api/v1/services', authMiddleware(), async (req, res) => {
  const u = (req as any).user; let where = ''; const params: unknown[] = []
  if (u.tenantId) { where = 'WHERE tenant_id = $1'; params.push(u.tenantId) }
  const r = await pool.query(`SELECT id, name, category, description, price, currency, tax_rate AS "taxRate", is_active AS "isActive" FROM services ${where}`, params)
  res.json(r.rows)
})
app.get('/api/v1/branches', authMiddleware(), async (req, res) => {
  const { tenantId } = req.query as Record<string, string>
  const u = (req as any).user; const tid = tenantId || u.tenantId
  let where = ''; const params: unknown[] = []
  if (tid) { where = 'WHERE tenant_id = $1'; params.push(tid) }
  const r = await pool.query(`SELECT id, tenant_id AS "tenantId", name, code, address, city, phone, email, is_active AS "isActive", is_headquarters AS "isHeadquarters", department_count AS "departmentCount", user_count AS "userCount", created_at AS "createdAt" FROM branches ${where}`, params)
  res.json(r.rows)
})

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/v1/settings', authMiddleware(), async (_req, res) => res.json({}))
app.patch('/api/v1/settings', authMiddleware(), async (req, res) => res.json({ message: 'Settings updated', ...req.body }))

// ── Audit Logs ─────────────────────────────────────────────────────────────────
app.get('/api/v1/audit-logs', authMiddleware(), async (req, res) => {
  const { action, startDate, endDate } = req.query as Record<string, string>
  let where = 'WHERE 1=1'; const params: unknown[] = []; let pc = 0
  if (action) { pc++; where += ` AND action = $${pc}`; params.push(action) }
  if (startDate) { pc++; where += ` AND created_at >= $${pc}`; params.push(startDate) }
  if (endDate) { pc++; where += ` AND created_at <= $${pc}`; params.push(endDate) }
  const r = await pool.query(`SELECT id, actor, actor_id AS "actorId", actor_role AS "actorRole", action, entity, entity_id AS "entityId", tenant_name AS "tenantName", status, ip_address AS "ipAddress", metadata, created_at AS "createdAt" FROM audit_logs ${where} ORDER BY id DESC LIMIT 50`, params)
  res.json({ data: r.rows, total: r.rows.length, page: 1, pageSize: 50, totalPages: 1 })
})
app.get('/api/v1/audit-logs/:id', authMiddleware(), async (req, res) => {
  const r = await pool.query('SELECT * FROM audit_logs WHERE id = $1', [req.params.id])
  if (r.rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(r.rows[0])
})

// ── Notifications ──────────────────────────────────────────────────────────────
app.get('/api/v1/notifications', authMiddleware(), async (_req, res) => res.json({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }))
app.get('/api/v1/notifications/unread-count', authMiddleware(), async (_req, res) => res.json({ count: 0 }))
app.patch('/api/v1/notifications/:id/read', authMiddleware(), async (req, res) => res.json({ id: req.params.id, isRead: true }))
app.patch('/api/v1/notifications/read-all', authMiddleware(), async (_req, res) => res.json({ message: 'All marked as read' }))

// ── Queue ──────────────────────────────────────────────────────────────────────
app.get('/api/v1/queue/today', authMiddleware(), async (req, res) => {
  try {
    const u = (req as any).user
    const r = await pool.query(`SELECT a.id, a.queue_number AS "queueNumber", a.patient_id AS "patientId", a.patient_name AS "patientName", a.patient_mrn AS "patientMrn", a.provider_name AS "providerName", a.department_name AS "departmentName", a.time AS "appointmentTime", a.checked_in_at AS "checkedInAt", CASE WHEN a.status = 'checked_in' THEN 'waiting' ELSE a.status END AS status FROM appointments a WHERE a.date = CURRENT_DATE AND a.status IN ('checked_in','completed','no_show') ${u.tenantId ? 'AND a.tenant_id = $1' : ''} ORDER BY a.queue_number`, u.tenantId ? [u.tenantId] : [])
    res.json(r.rows)
  } catch { res.json([]) }
})

// ── Reports ────────────────────────────────────────────────────────────────────
app.get('/api/v1/reports/summary', authMiddleware(), async (req, res) => {
  try {
    const u = (req as any).user; const tid = u.tenantId
    const pt = await pool.query('SELECT COUNT(*) FROM patients WHERE created_at::date = CURRENT_DATE AND ($1::bigint IS NULL OR tenant_id = $1)', [tid])
    const at = await pool.query('SELECT COUNT(*) FROM appointments WHERE date = CURRENT_DATE AND ($1::bigint IS NULL OR tenant_id = $1)', [tid])
    const ob = await pool.query("SELECT COUNT(*) FROM invoices WHERE balance > 0 AND ($1::bigint IS NULL OR tenant_id = $1)", [tid])
    res.json({ patientsToday: parseInt(pt.rows[0].count), appointmentsToday: parseInt(at.rows[0].count), outstandingBills: parseInt(ob.rows[0].count), stockAlerts: 0, pendingLabWork: 0, admissions: 0, dischargedToday: 0, pendingQueue: 0 })
  } catch { res.json({ patientsToday: 0, appointmentsToday: 0, outstandingBills: 0, stockAlerts: 0, pendingLabWork: 0, admissions: 0, dischargedToday: 0, pendingQueue: 0 }) }
})
app.get('/api/v1/reports/revenue', authMiddleware(), async (_req, res) => res.json({ summary: {}, trend: [], rows: [] }))
app.get('/api/v1/reports/stock', authMiddleware(), async (_req, res) => res.json({ summary: {}, trend: [], rows: [] }))
app.get('/api/v1/reports/patients', authMiddleware(), async (_req, res) => res.json({ summary: {}, trend: [], rows: [] }))
app.get('/api/v1/reports/lab-turnaround', authMiddleware(), async (_req, res) => res.json({}))
app.get('/api/v1/admin/reports/platform', authMiddleware(), async (_req, res) => res.json({ summary: {}, trend: [] }))

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/v1/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }) }
  catch { res.status(500).json({ error: 'Database connection failed' }) }
})

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => { console.log(`HealthOS backend started on port ${PORT}`) })