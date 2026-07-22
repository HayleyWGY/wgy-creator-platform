import { NextRequest, NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { getActiveSession } from "@/lib/session";
import { sanitizeRichText } from "@/lib/sanitize";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/reading-time";
import { publishDueScheduled, contentNotifyTitle } from "@/lib/scheduled-publish";
import { notifyAllCreators } from "@/lib/notify";
import { logAudit } from "@/lib/audit";

const CONTENT_ORDER = [{ sortOrder: "asc" as const }, { publishedAt: "desc" as const }, { createdAt: "desc" as const }];

// Cached member-facing (published) content list. The Learning Lounge list is
// identical for every member and changes only when an admin publishes/edits,
// so we serve it from cache instead of hitting the DB on every visit. Belt
// and suspenders: a 60s revalidate AND the 'content' tag — admin changes call
// revalidateTag('content') for instant freshness, and even if that ever
// missed, staleness self-heals within 60s. Admin reads stay uncached below.
const getPublishedContent = unstable_cache(
  async (section: string | null, contentType: string | null) => {
    const where: Record<string, unknown> = { status: "published" };
    if (contentType) where.contentType = contentType;
    if (section) where.section = section;
    return prisma.postContent.findMany({ where, orderBy: CONTENT_ORDER, take: 200 });
  },
  ["content-published"],
  { revalidate: 60, tags: ["content"] },
);

export async function GET(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const section     = searchParams.get("section");
  const contentType = searchParams.get("contentType");

  try {
    // Flip any due scheduled campaigns/content live before reading
    // (self-throttled to once/60s per instance)
    await publishDueScheduled().catch(() => {});

    // Members always get the published list — served from cache
    if (!session.user.isAdmin) {
      const items = await getPublishedContent(section, contentType);
      return NextResponse.json(items);
    }

    // Admin: uncached, may request any status (incl. drafts they just edited)
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status)      where.status      = status;
    if (contentType) where.contentType = contentType;
    if (section)     where.section     = section;

    const items = await prisma.postContent.findMany({
      where,
      orderBy: CONTENT_ORDER,
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

    // Bust the members' cached content list so new content shows immediately
    revalidateTag("content");

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
