/**
 * One-off migration: encrypts the sensitive creator PII fields
 * (dateOfBirth, address, contactNumber, gender) that were stored as
 * plaintext before field-level encryption was added (lib/field-crypto.ts).
 *
 * Idempotent — values already carrying the enc:v1: prefix are skipped, so
 * re-running is always safe.
 *
 * Run with: node scripts/encrypt-sensitive-fields.js
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const PREFIX = 'enc:v1:'
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY || '', 'base64')
if (KEY.length !== 32) {
  console.error('FIELD_ENCRYPTION_KEY missing or not 32 bytes — check .env')
  process.exit(1)
}

// Mirrors lib/field-crypto.ts encryptField exactly
function encryptField(plaintext) {
  if (!plaintext) return null
  if (plaintext.startsWith(PREFIX)) return plaintext
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

const FIELDS = ['dateOfBirth', 'address', 'contactNumber', 'gender']

;(async () => {
  const DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL
  const adapter = new PrismaPg({ connectionString: DIRECT_URL, max: 1 })
  const prisma = new PrismaClient({ adapter })

  try {
    const creators = await prisma.creator.findMany({
      select: { id: true, email: true, dateOfBirth: true, address: true, contactNumber: true, gender: true },
    })

    let updated = 0
    let alreadyEncrypted = 0

    for (const c of creators) {
      const data = {}
      for (const field of FIELDS) {
        const value = c[field]
        if (!value) continue
        if (value.startsWith(PREFIX)) { alreadyEncrypted++; continue }
        data[field] = encryptField(value)
      }
      if (Object.keys(data).length > 0) {
        await prisma.creator.update({ where: { id: c.id }, data })
        updated++
        console.log(`  ✓ Encrypted ${Object.keys(data).join(', ')} for ${c.email}`)
      }
    }

    console.log(`\nDone. ${creators.length} creators checked, ${updated} updated, ${alreadyEncrypted} field values were already encrypted.`)
  } finally {
    await prisma.$disconnect()
  }
})()
