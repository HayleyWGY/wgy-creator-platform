import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { encryptField, decryptField } from '@/lib/field-crypto'

const SENSITIVE_FIELDS = new Set(['dateOfBirth', 'address', 'contactNumber', 'gender'])

export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { dateOfBirth: true, address: true, contactNumber: true, gender: true },
  })
  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    creator: {
      dateOfBirth: decryptField(creator.dateOfBirth),
      address: decryptField(creator.address),
      contactNumber: decryptField(creator.contactNumber),
      gender: decryptField(creator.gender),
    },
  })
}

export async function PATCH(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`profile-sensitive-update:${session.user.id}`, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const body = await req.json()
  const data: Record<string, string | null> = {}
  for (const key of Object.keys(body)) {
    if (!SENSITIVE_FIELDS.has(key)) continue
    const value = body[key]
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: `${key} must be a string or null` }, { status: 400 })
    }
    data[key] = value
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  // Normalise DOB to YYYY-MM-DD before encrypting so age maths stays sane
  if (typeof data.dateOfBirth === 'string') {
    const parsed = new Date(data.dateOfBirth)
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
    }
    data.dateOfBirth = parsed.toISOString().slice(0, 10)
  }

  const encrypted: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(data)) {
    encrypted[key] = encryptField(value)
  }

  const creator = await prisma.creator.update({
    where: { id: session.user.id },
    data: encrypted,
    select: { dateOfBirth: true, address: true, contactNumber: true, gender: true },
  })
  return NextResponse.json({
    creator: {
      dateOfBirth: decryptField(creator.dateOfBirth),
      address: decryptField(creator.address),
      contactNumber: decryptField(creator.contactNumber),
      gender: decryptField(creator.gender),
    },
  })
}
