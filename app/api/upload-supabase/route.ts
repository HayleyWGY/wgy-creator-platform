import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getActiveSession } from "@/lib/session"
import { rateLimit } from '@/lib/rate-limit'

// Only buckets the app legitimately writes to via this endpoint.
// The bucket must NEVER be taken freely from the request — this route runs
// with the service-role key, which bypasses all RLS.
const ALLOWED_BUCKETS = new Set(['creator-posts'])

// Image-only. Extension is derived from the validated MIME type, never from
// the client-supplied filename.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB — matches the client-side limit

export async function POST(req: Request) {
  // Auth required — this endpoint was previously open to the internet.
  const session = await getActiveSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!rateLimit(`upload:${session.user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — please slow down' }, { status: 429 })
  }


  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const bucket = (formData.get('bucket') as string) || 'creator-posts'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF images are allowed' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      // Log internally; never leak storage internals to the client.
      console.error('[upload-supabase] storage error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('[upload-supabase] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
