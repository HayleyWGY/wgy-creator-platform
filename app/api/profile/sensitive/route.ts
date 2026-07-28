import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { encryptField, decryptField } from '@/lib/field-crypto'
import { parseJson, sensitivePatchSchema } from '@/lib/validation'

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

  const raw = await req.json().catch(() => null)
  const parsed = parseJson(sensitivePatchSchema, raw)
  if (!parsed.ok) return parsed.response

  // Only the keys the caller sent (partial PATCH).
  const data: Record<string, string | null> = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  )
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  // Normalise DOB to YYYY-MM-DD before encrypting so age maths stays sane.
  // The schema already rejected an unparseable date, so this can't fail.
  if (typeof data.dateOfBirth === 'string' && data.dateOfBirth) {
    data.dateOfBirth = new Date(data.dateOfBirth).toISOString().slice(0, 10)
  }

  const encrypted: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(data)) {
    encrypted[key] = encryptField(value)
  }

  try {
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
  } catch (err) {
    console.error('[PATCH /api/profile/sensitive]', err)
    return NextResponse.json({ error: 'Failed to update details' }, { status: 500 })
  }
}
