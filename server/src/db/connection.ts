import { Pool, QueryResult } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// DATABASE_URL (a single connection string, e.g. from Neon) takes precedence
// over the individual DB_* vars used by the Dokploy deployment, so the same
// code runs unmodified on either.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=') ? undefined : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'zapiar_flow',
    })

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development') {
      console.log(`Executed query in ${duration}ms`, { text, params })
    }
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

export async function getClient() {
  return pool.connect()
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()')
    return result.rows.length > 0
  } catch {
    return false
  }
}

export default pool
