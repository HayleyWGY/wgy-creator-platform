import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { sanitizeRichText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/reading-time";
import { contentNotifyTitle } from "@/lib/scheduled-publish";
import { notifyAllCreators } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getActiveSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const item = await prisma.postContent.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Drafts and scheduled items are admin-only
    if (item.status !== "published" && !session.user.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const readingTimeMinutes = body.body ? calculateReadingTime(body.body) : undefined;

    const data: Record<string, unknown> = {
      title:               body.title,
      contentType:         body.contentType,
      body:                body.body ? sanitizeRichText(body.body) : null,
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

    // Set publishedAt when first publishing (and notify creators once)
    let firstPublish = false;
    if (body.status === "published") {
      const existing = await prisma.postContent.findUnique({
        where: { id: params.id },
        select: { publishedAt: true, status: true },
      });
      if (!existing?.publishedAt) data.publishedAt = new Date();
      firstPublish = existing?.status !== "published";
    }

    const item = await prisma.postContent.update({ where: { id: params.id }, data });

    if (firstPublish) {
      const notifyTitle = contentNotifyTitle(item.section);
      if (notifyTitle) {
        notifyAllCreators({
          type: "content",
          title: notifyTitle,
          description: item.title,
          referenceId: item.id,
        }).catch(err => console.error("[notify content publish]", err));
      }
    }

    await logAudit({
      actorId: session.user.id,
      action: `Edited content (${item.status})`,
      detail: `${item.title} [${item.section}]`,
      targetType: "content",
      targetId: item.id,
    });

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
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const item = await prisma.postContent.findUnique({
      where: { id: params.id },
      select: { title: true, section: true },
    });
    await prisma.postContent.delete({ where: { id: params.id } });
    await logAudit({
      actorId: session.user.id,
      action: "Deleted content",
      detail: item ? `${item.title} [${item.section}]` : params.id,
      targetType: "content",
      targetId: params.id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/content/[id]]", err);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
