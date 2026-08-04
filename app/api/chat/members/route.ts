import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPayingSession } from '@/lib/session'

// GET /api/chat/members?q= — member lookup for the @mention picker in group
// chats. Rooms are open to all members, so this searches everyone active
// (admins included — they're in the chats too) by first/last name. Returns
// only the fields the picker renders; never contact details or status.
export async function GET(req: NextRequest) {
  const session = await getPayingSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 1) return NextResponse.json({ members: [] })

  // Split on whitespace so "jo wa" matches first "Jo…" AND last "Wa…".
  const terms = q.split(/\s+/).slice(0, 3)
  const members = await prisma.creator.findMany({
    where: {
      membershipStatus: { not: 'cancelled' },
      id: { not: session.user.id }, // can't mention yourself
      AND: terms.map(t => ({
        OR: [
          { firstName: { contains: t, mode: 'insensitive' as const } },
          { lastName: { contains: t, mode: 'insensitive' as const } },
        ],
      })),
    },
    select: { id: true, firstName: true, lastName: true, profileImageUrl: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: 8,
  })

  return NextResponse.json({ members })
}
