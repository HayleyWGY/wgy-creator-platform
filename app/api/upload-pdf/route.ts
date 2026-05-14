import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: "public",
      contentType: "application/pdf",
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[POST /api/upload-pdf]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
