import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/reading-time";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.postContent.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error("[GET /api/content/[id]]", err);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const readingTimeMinutes = body.body ? calculateReadingTime(body.body) : undefined;

    const data: Record<string, unknown> = {
      title:               body.title,
      contentType:         body.contentType,
      body:                body.body ?? null,
      pdfUrl:              body.pdfUrl ?? null,
      editableTemplateUrl: body.editableTemplateUrl ?? null,
      videoEmbedUrl:       body.videoEmbedUrl ?? null,
      videoTranscript:     body.videoTranscript ?? null,
      thumbnailUrl:        body.thumbnailUrl ?? null,
      bannerImageUrl:      body.bannerImageUrl ?? null,
      section:             body.section,
      categories:          body.categories ?? [],
      status:              body.status,
      scheduledAt:         body.scheduledAt ? new Date(body.scheduledAt) : null,
      sortOrder:           body.sortOrder ?? 0,
    };

    if (readingTimeMinutes !== undefined) data.readingTimeMinutes = readingTimeMinutes;

    // Set publishedAt when first publishing
    if (body.status === "published") {
      const existing = await prisma.postContent.findUnique({
        where: { id: params.id },
        select: { publishedAt: true },
      });
      if (!existing?.publishedAt) data.publishedAt = new Date();
    }

    const item = await prisma.postContent.update({ where: { id: params.id }, data });
    return NextResponse.json(item);
  } catch (err) {
    console.error("[PATCH /api/content/[id]]", err);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.postContent.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/content/[id]]", err);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
