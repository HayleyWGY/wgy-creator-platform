import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { getActiveSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side validation — client checks are bypassable
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF must be under 20MB" }, { status: 400 });
    }

    // Safe server-generated name — never trust the client filename.
    // CSPRNG, not Math.random(): the blob is stored with public access, so a
    // guessable name is the difference between "unlisted" and "readable by
    // anyone". See the note in lib/upload-validation.ts buildUploadPath.
    const safeName = `wgy-content/${Date.now()}-${crypto.randomUUID()}.pdf`;
    const blob = await put(safeName, file, {
      access: "public",
      contentType: "application/pdf",
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[POST /api/upload-pdf]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
