// Loads .env for the test run so integration tests can reach real services
// (currently Upstash Redis). Tests that need a specific value still override
// it explicitly in their own beforeAll.
import fs from 'fs'
import path from 'path'

const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}
