import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveSession } from '@/lib/session'

// GET — new-member checklist state, derived from real data (no manual
// ticking): each item completes itself when the underlying thing is done.
export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [creator, groupChatMessages] = await Promise.all([
    prisma.creator.findUnique({
      where: { id: session.user.id },
      select: {
        profileImageUrl: true,
        instagramHandle: true,
        tiktokHandle: true,
        youtubeUrl: true,
        address: true,
        addressLine1: true,
        firstApplyAt: true,
      },
    }),
    prisma.chatMessage.count({
      where: {
        authorId: session.user.id,
        room: { slug: 'group-chat' },
      },
    }),
  ])

  if (!creator) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = {
    photo: !!creator.profileImageUrl,
    socials: !!(creator.instagramHandle || creator.tiktokHandle || creator.youtubeUrl),
    address: !!(creator.address || creator.addressLine1),
    saidHi: groupChatMessages > 0,
    applied: !!creator.firstApplyAt,
  }

  const complete = Object.values(items).every(Boolean)

  return NextResponse.json({ items, complete })
}
