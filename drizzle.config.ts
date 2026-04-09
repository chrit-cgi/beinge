import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './shell/src/db/schema.ts',
    './app01/src/db/schema.ts',
  ],
  out: './drizzle',
})
