import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const SENSITIVE_FIELDS = new Set(['dateOfBirth', 'address', 'contactNumber', 'gender'])

export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creator = await prisma.creator.findUnique({
    where: { id: session.user.id },
    select: { dateOfBirth: true, address: true, contactNumber: true, gender: true },
  })
  return NextResponse.json({ creator })
}

export async function PATCH(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (SENSITIVE_FIELDS.has(key)) data[key] = body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  if (data.dateOfBirth) {
    data.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth as string) : null
  }

  const creator = await prisma.creator.update({
    where: { id: session.user.id },
    data,
    select: { dateOfBirth: true, address: true, contactNumber: true, gender: true },
  })
  return NextResponse.json({ creator })
}
