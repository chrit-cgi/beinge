import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const pool = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(pool)
