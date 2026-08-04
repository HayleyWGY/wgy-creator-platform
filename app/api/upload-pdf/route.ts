import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { getPayingSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPdfBytes } from "@/lib/upload-validation";

export async function POST(req: NextRequest) {
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // Admin-only, but still throttled — a modest per-admin limit so a stolen
  // admin session can't spray the public blob store.
  if (!(await rateLimit(`upload-pdf:${session.user.id}`, 10, 60_000))) {
    return NextResponse.json({ error: "Too many requests — please slow down" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size first (no read needed), then verify the actual BYTES are a PDF — the
    // client-declared file.type is bypassable, and this blob is stored PUBLIC.
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF must be under 20MB" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const magic = verifyPdfBytes(bytes, file.type);
    if (!magic.ok) {
      return NextResponse.json({ error: magic.error }, { status: 400 });
    }

    // Safe server-generated name — never trust the client filename.
    // CSPRNG, not Math.random(): the blob is stored with public access, so a
    // guessable name is the difference between "unlisted" and "readable by
    // anyone". See the note in lib/upload-validation.ts buildUploadPath.
    const safeName = `wgy-content/${Date.now()}-${crypto.randomUUID()}.pdf`;
    const blob = await put(safeName, bytes, {
      access: "public",
      contentType: "application/pdf",
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[POST /api/upload-pdf]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
