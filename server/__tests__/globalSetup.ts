import { execSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

export default async function globalSetup() {
  // Run prisma db push on the test database (DATABASE_URL from .env.test)
  console.log('[TEST] Running prisma db push on test database...')
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env }
  })
  console.log('[TEST] Test database ready.')
}
