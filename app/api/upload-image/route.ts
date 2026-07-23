import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'
import { validateImageUpload, buildUploadPath } from '@/lib/upload-validation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'wgy-uploads'
const PREFIX = 'creator-posts'

// Single image-upload endpoint for creators — used by community posts and DM
// attachments. Consolidated from the former upload-image/upload-supabase pair,
// keeping the stricter validation of the two (MIME allowlist, extension
// derived from the MIME type, never the client filename).
export async function POST(req: NextRequest) {
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!(await rateLimit(`upload:${session.user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const check = validateImageUpload(file.type, file.size)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }

    const path = buildUploadPath(PREFIX, check.ext)
    const bytes = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (error) {
      // Log internally; never leak storage internals to the client.
      console.error('[POST /api/upload-image] storage error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('[POST /api/upload-image]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
