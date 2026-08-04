import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateImageUpload, verifyImageBytes } from '@/lib/upload-validation'

const PROFILE_BUCKET = 'profiles'

export async function POST(req: Request) {
  const session = await getActiveSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(`upload:${session.user.id}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  const supabase = getSupabaseAdmin()

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validation via the SHARED helper (single source of truth): MIME allowlist
  // + size, then a magic-byte check that the bytes really are the declared
  // image type. Previously this route duplicated the check inline with a
  // different allowlist (no GIF) and cap (10MB) and no content check.
  const check = validateImageUpload(file.type, file.size)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const magic = verifyImageBytes(buffer, file.type)
  if (!magic.ok) return NextResponse.json({ error: magic.error }, { status: 400 })

  const fileName = `${session.user.id}-${Date.now()}.${check.ext}`

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('Profile upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(fileName)

  await prisma.creator.update({
    where: { id: session.user.id },
    data: { profileImageUrl: data.publicUrl },
  })

  // Delete this creator's PREVIOUS profile images. Each upload writes a new
  // `${id}-${Date.now()}` key, so without this, storage grows without bound.
  // Best-effort: a cleanup failure must not fail the upload the user just made.
  try {
    const { data: existing } = await supabase.storage
      .from(PROFILE_BUCKET)
      .list('', { limit: 100, search: session.user.id })
    const stale = (existing ?? [])
      .map(o => o.name)
      .filter(name => name.startsWith(`${session.user.id}-`) && name !== fileName)
    if (stale.length > 0) {
      await supabase.storage.from(PROFILE_BUCKET).remove(stale)
    }
  } catch (cleanupErr) {
    console.error('Profile image cleanup error:', cleanupErr)
  }

  return NextResponse.json({ url: data.publicUrl })
}
