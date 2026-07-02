import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rooms = await prisma.chatRoom.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json({ rooms })
}
