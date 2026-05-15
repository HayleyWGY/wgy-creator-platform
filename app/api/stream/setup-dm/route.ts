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

    // Get admin user from database
    const admin = await prisma.creator.findFirst({
      where: { isAdmin: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const creatorId = session.user.id
    const adminId = admin.id

    // Ensure both users exist in Stream
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

    // Create consistent channel ID — sort so same channel is found regardless of who initiates
    const channelId = [creatorId, adminId]
      .sort()
      .join('_dm_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')

    // Create or get the DM channel
    const channel = client.channel('messaging', channelId, {
      members: [creatorId, adminId],
      created_by_id: creatorId,
    })

    await channel.create()
    await channel.addMembers([creatorId, adminId])

    return NextResponse.json({ channelId, success: true })
  } catch (error) {
    console.error('DM setup error:', error)
    return NextResponse.json({ error: 'DM setup failed' }, { status: 500 })
  }
}
