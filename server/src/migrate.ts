import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config()

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
})

async function migrate() {
  console.log('Running schema migration...')

  // Read and run schema.sql
  const schemaPath = join(__dirname, '..', 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')

  // Run each statement separately
  const statements = schema.split(/;(?![^(]*\))/).filter(s => s.trim().length > 0)

  for (const stmt of statements) {
    try {
      await pool.query(stmt + ';')
    } catch (err: unknown) {
      const msg = (err as Error).message
      if (!msg.includes('already exists')) {
        console.log('  Statement skipped:', msg.slice(0, 80))
      }
    }
  }
  console.log('Schema applied.')

  // Generate proper bcrypt hash for the test password
  console.log('Generating bcrypt hash for Test@1234...')
  const hash = await bcrypt.hash('Test@1234', 10)
  console.log('Hash:', hash)

  // Update all seeded users with the real hash
  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id IN (1,2,3,4,5,6,7,8,9,10,11)`,
    [hash]
  )
  console.log('Updated password hashes for all test users.')

  // Update tenant counts
  await pool.query(`
    UPDATE tenants SET user_count = (SELECT COUNT(*) FROM users WHERE tenant_id = tenants.id),
    branch_count = (SELECT COUNT(*) FROM branches WHERE tenant_id = tenants.id)
  `)

  console.log('\nMigration complete!')
  console.log('Test credentials:')
  console.log('  superadmin@test.com    / Test@1234  (super_admin)')
  console.log('  admin@hospital.com     / Test@1234  (hospital_admin)')
  console.log('  owner@hospital.com     / Test@1234  (hospital_owner)')
  console.log('  doctor@hospital.com     / Test@1234  (doctor)')
  console.log('  nurse@hospital.com      / Test@1234  (nurse)')
  console.log('  reception@hospital.com  / Test@1234  (receptionist)')
  console.log('  cashier@hospital.com    / Test@1234  (cashier)')
  console.log('  pharmacy@hospital.com   / Test@1234  (pharmacist)')
  console.log('  lab@hospital.com       / Test@1234  (lab_technician)')
  console.log('  inventory@hospital.com  / Test@1234  (inventory_officer)')
  console.log('  auditor@hospital.com    / Test@1234  (auditor)')

  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
