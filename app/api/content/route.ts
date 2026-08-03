import { parseJson, contentWriteSchema } from '@/lib/validation';
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { getPayingSession } from "@/lib/session";
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
// Pagination defaults. limit/offset are ARGUMENTS to the cached function, so
// unstable_cache keys each page separately (no cross-page/-member leak) while
// identical (section, type, offset) requests share a cache entry across members.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePaging(searchParams: URLSearchParams) {
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  return { limit, offset };
}

async function runContentQuery(where: Record<string, unknown>, limit: number, offset: number) {
  const [items, total] = await Promise.all([
    prisma.postContent.findMany({ where, orderBy: CONTENT_ORDER, skip: offset, take: limit }),
    prisma.postContent.count({ where }),
  ]);
  return { items, total };
}

const getPublishedContent = unstable_cache(
  async (section: string | null, contentType: string | null, limit: number, offset: number) => {
    const where: Record<string, unknown> = { status: "published" };
    if (contentType) where.contentType = contentType;
    if (section) where.section = section;
    return runContentQuery(where, limit, offset);
  },
  ["content-published"],
  { revalidate: 60, tags: ["content"] },
);

// Uncached search across the whole published library (title match).
async function searchPublishedContent(section: string | null, contentType: string | null, q: string, limit: number, offset: number) {
  const where: Record<string, unknown> = {
    status: "published",
    title: { contains: q, mode: "insensitive" },
  };
  if (contentType) where.contentType = contentType;
  if (section) where.section = section;
  return runContentQuery(where, limit, offset);
}

// Pagination metadata rides on headers so the response body stays the bare
// array every existing client already reads — no client breaks, and paginating
// clients read X-Total-Count / X-Has-More.
function pagedJson(items: unknown[], total: number, limit: number, offset: number) {
  return NextResponse.json(items, {
    headers: {
      "X-Total-Count": String(total),
      "X-Has-More": String(offset + items.length < total),
      "X-Limit": String(limit),
      "X-Offset": String(offset),
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getPayingSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const section     = searchParams.get("section");
  const contentType = searchParams.get("contentType");
  const q           = searchParams.get("q")?.trim() || null;
  const { limit, offset } = parsePaging(searchParams);

  try {
    // Flip any due scheduled campaigns/content live before reading
    // (self-throttled to once/60s per instance)
    await publishDueScheduled().catch(() => {});

    // Members always get the published list — cached, unless searching, which
    // takes the uncached path so it covers the whole library.
    if (!session.user.isAdmin) {
      const { items, total } = q
        ? await searchPublishedContent(section, contentType, q, limit, offset)
        : await getPublishedContent(section, contentType, limit, offset);
      return pagedJson(items, total, limit, offset);
    }

    // Admin: uncached, may request any status (incl. drafts they just edited)
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status)      where.status      = status;
    if (contentType) where.contentType = contentType;
    if (section)     where.section     = section;
    if (q)           where.title       = { contains: q, mode: "insensitive" };

    const { items, total } = await runContentQuery(where, limit, offset);
    return pagedJson(items, total, limit, offset);
  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const valid = parseJson(contentWriteSchema, body);
    if (!valid.ok) return valid.response;

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
        await notifyAllCreators({
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
