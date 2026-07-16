import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { sanitizeRichText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/reading-time";
import { publishDueScheduled, contentNotifyTitle } from "@/lib/scheduled-publish";
import { notifyAllCreators } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const section     = searchParams.get("section");
  const contentType = searchParams.get("contentType");
  // Non-admins can only request published content
  const status = session.user.isAdmin
    ? searchParams.get("status")
    : "published";

  try {
    // Flip any due scheduled campaigns/content live before reading
    await publishDueScheduled().catch(() => {});

    const where: Record<string, unknown> = {};
    if (status)      where.status      = status;
    if (contentType) where.contentType = contentType;
    if (section)     where.section     = section;

    const items = await prisma.postContent.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 200, // prevent unbounded queries
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const readingTimeMinutes = body.body ? calculateReadingTime(body.body) : null;

    const item = await prisma.postContent.create({
      data: {
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
        status:              body.status ?? "draft",
        scheduledAt:         body.scheduledAt ? new Date(body.scheduledAt) : null,
        publishedAt:         body.status === "published" ? new Date() : null,
        authorId:            body.authorId ?? session.user.id,
        sortOrder:           body.sortOrder ?? 0,
        readingTimeMinutes,
      },
    });

    // Notify creators when content is published straight away
    if (item.status === "published") {
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
      action: `Created content (${item.status})`,
      detail: `${item.title} [${item.section}]`,
      targetType: "content",
      targetId: item.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/content]", err);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}
