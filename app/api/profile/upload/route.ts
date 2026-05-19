import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${session.user.id}-${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabase.storage
    .from('profiles')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('Profile upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from('profiles').getPublicUrl(fileName)

  await prisma.creator.update({
    where: { id: session.user.id },
    data: { profileImageUrl: data.publicUrl },
  })

  return NextResponse.json({ url: data.publicUrl })
}
