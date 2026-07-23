import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveSession } from "@/lib/session";
import {
  validateImageUpload,
  buildUploadPath,
  MAX_ADMIN_IMAGE_BYTES,
} from "@/lib/upload-validation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = "wgy-uploads";

export async function POST(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) ?? "wgy-campaigns";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!["wgy-campaigns", "wgy-content"].includes(folder)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    // Same strict validation as the creator upload route: MIME allowlist
    // (rejects SVG, which can carry scripts and is served from a public
    // bucket) and the extension derived from the validated type rather than
    // the client-supplied filename.
    const check = validateImageUpload(file.type, file.size, MAX_ADMIN_IMAGE_BYTES);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const path = buildUploadPath(folder, check.ext);
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (error) {
      // Log internally; never leak storage internals to the client.
      console.error("[POST /api/upload] storage error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
