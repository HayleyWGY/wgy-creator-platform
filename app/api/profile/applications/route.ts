import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// GET — the signed-in creator's 5 most recent campaign applications, for the
// "Recent campaigns applied to" section on their profile.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const applications = await prisma.campaignApplication.findMany({
    where: { creatorId: session.user.id },
    orderBy: { appliedAt: 'desc' },
    take: 5,
    select: { id: true, campaignName: true, campaignSlug: true, appliedAt: true },
  })

  return NextResponse.json({ applications })
}
