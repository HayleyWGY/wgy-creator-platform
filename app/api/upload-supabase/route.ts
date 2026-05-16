import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucket = (formData.get('bucket') as string) || 'creator-posts'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw error
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
