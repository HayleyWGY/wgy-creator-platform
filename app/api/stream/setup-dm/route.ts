import { getStreamServerClient } from '@/lib/stream'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const client = getStreamServerClient()

    const admin = await prisma.creator.findFirst({ where: { isAdmin: true } })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const creatorId = session.user.id
    const adminId = admin.id

    // Upsert both users in Stream
    await client.upsertUsers([
      {
        id: creatorId,
        name: `${session.user.firstName} ${session.user.lastName}`,
        role: 'user',
      },
      {
        id: adminId,
        name: 'WGY LTD',
        role: 'admin',
      },
    ])

    // Consistent channel ID (sorted so same channel regardless of who initiates)
    const members = [creatorId, adminId].sort()
    const channelId = members
      .join('---')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 64)

    const channel = client.channel('messaging', channelId, {
      members,
      created_by_id: adminId,
    })

    await channel.create()

    return NextResponse.json({ channelId, success: true })
  } catch (err: unknown) {
    console.error('DM setup error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 },
    )
  }
}
