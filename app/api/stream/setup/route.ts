/*
MANUAL STREAM DASHBOARD SETUP REQUIRED:

1. Go to getstream.io dashboard
2. Select WGY Creator Platform app
3. Go to Chat → Roles & Permissions
4. Find the 'user' role
5. Remove the 'send-links' permission for @everyone mentions
6. Only 'admin' role should have 'create-channel' and
   'send-mentions-to-all' permissions

This prevents creators from using @everyone.
Only WGY admin can tag everyone in a channel.

7. For message moderation:
   Go to Chat → Message Moderation
   Enable admin-only message deletion
   Admins can delete any message
   Users can only delete own messages
*/

import { NextResponse } from 'next/server'
import { getStreamServerClient, COMMUNITY_ROOMS } from '@/lib/stream'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const client = getStreamServerClient()
    const userId = session.user.id

    // Create/update all community channels and add user as member
    for (const room of COMMUNITY_ROOMS) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channelData: any = { name: room.name, created_by_id: 'wgy-system', members: [userId] }
        const channel = client.channel('messaging', room.id, channelData)
        await channel.create()
        await channel.addMembers([userId])
      } catch {
        // Channel may already exist — addMembers call still ensures user is a member
        const channel = client.channel('messaging', room.id)
        await channel.addMembers([userId])
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/stream/setup]', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
