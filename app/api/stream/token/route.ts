import { NextResponse } from 'next/server'
import { getStreamServerClient } from '@/lib/stream'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const client   = getStreamServerClient()
    const userId   = session.user.id
    const userName = `${session.user.firstName} ${session.user.lastName}`

    await client.upsertUser({
      id:   userId,
      name: userName,
      role: session.user.isAdmin ? 'admin' : 'user',
    })

    const token = client.createToken(userId)

    return NextResponse.json({
      token,
      userId,
      userName,
      isAdmin: session.user.isAdmin,
    })
  } catch (error) {
    console.error('[GET /api/stream/token]', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
