import { parseJson, campaignWriteSchema } from '@/lib/validation';
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPayingSession } from "@/lib/session"
import { notifyAllCreators } from "@/lib/notify";
import { publishDueScheduled } from "@/lib/scheduled-publish";
import { logAudit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";

// The exact row shape every campaign query returns: a Post plus its section's
// name + slug (the include used by runCampaignQuery below).
type CampaignRow = Prisma.PostGetPayload<{
  include: { section: { select: { name: true; slug: true } } }
}>;

function mapCampaign(p: CampaignRow) {
  return {
    id:                    p.id,
    slug:                  p.slug ?? p.id,
    brandName:             p.brandName ?? "",
    brandInitials:         (p.brandName ?? "??").slice(0, 2).toUpperCase(),
    brandLogoUrl:          p.brandLogoUrl,
    coverImageUrl:         p.coverImageUrl,
    campaignType:          p.campaignType ?? p.postType,
    title:                 p.title,
    brandDescription:      p.brandDescription,
    brandWebsite:          p.brandWebsite,
    brandInstagram:        p.brandInstagram,
    brandTikTok:           p.brandTikTok,
    opportunityDescription: p.opportunityDescription,
    deliverables:          p.deliverables as string[] | null,
    applyLinkUrl:          p.applyLinkUrl ?? "",
    spotsRemaining:        p.spotsRemaining,
    paymentAmount:         p.paymentAmount,
    paymentTerms:          p.paymentTerms,
    eventDate:             p.eventDate,
    eventTime:             p.eventTime,
    eventLocation:         p.eventLocation,
    likesCount:            p.likesCount,
    commentsCount:         p.commentsCount,
    applyClicks:           p.applyClicks,
    status:                p.status,
    scheduledAt:           p.scheduledAt,
    createdAt:             p.createdAt,
    sectionName:           p.section.name,
    sectionSlug:           p.section.slug,
  };
}

// Cached member-facing (non-admin) campaigns list. The opportunities feed is
// the most-visited page and is the same for every member, so it's served from
// cache keyed by (filter, liveOnly) rather than re-queried on every visit.
// 60s revalidate + the 'campaigns' tag: admin create/edit/status changes call
// revalidateTag('campaigns') for instant freshness (like/comment counts may
// be up to 60s stale, which is fine for social-proof numbers).
// Pagination defaults. limit/offset are passed as ARGUMENTS to the cached
// function below, so unstable_cache folds them into its key automatically —
// each page is cached under its own key, pages never collide, and because the
// list is identical for every member the same offsets share the same cache
// entry (hit rate preserved). revalidateTag('campaigns') still busts all pages.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePaging(searchParams: URLSearchParams) {
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
  return { limit, offset };
}

// Builds the member (non-admin) opportunities WHERE: only live/closed posts in
// opportunity sections, optionally narrowed to a filter tab. Shared by the
// cached browse path and the uncached search path so they never diverge.
async function buildMemberCampaignWhere(filter: string | null, liveOnly: boolean) {
  const and: Record<string, unknown>[] = [
    { status: liveOnly ? "published" : { in: ["published", "closed"] } },
  ];

  const opportunitySections = await prisma.section.findMany({
    where: { group: "OPPORTUNITIES" },
    select: { id: true },
  });
  if (opportunitySections.length > 0) {
    and.push({ sectionId: { in: opportunitySections.map((s: { id: string }) => s.id) } });
  }

  if (filter && FILTER_TO_CAMPAIGN_TYPE[filter]) {
    const filterSection = await prisma.section.findUnique({
      where: { slug: FILTER_TO_SECTION_SLUG[filter] },
      select: { id: true },
    });
    const or: Record<string, unknown>[] = [
      { campaignType: FILTER_TO_CAMPAIGN_TYPE[filter] },
      { postType: FILTER_TO_POST_TYPE[filter] },
    ];
    if (filterSection) or.push({ sectionId: filterSection.id });
    and.push({ OR: or });
  }

  return { AND: and };
}

// Case-insensitive text match across the fields a member searches on.
function campaignSearchClause(q: string) {
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { brandName: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

async function runCampaignQuery(where: Record<string, unknown>, limit: number, offset: number) {
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
      include: { section: { select: { name: true, slug: true } } },
    }),
    prisma.post.count({ where }),
  ]);
  return { campaigns: posts.map(mapCampaign), total };
}

const getMemberCampaigns = unstable_cache(
  async (filter: string | null, liveOnly: boolean, limit: number, offset: number) => {
    const where = await buildMemberCampaignWhere(filter, liveOnly);
    return runCampaignQuery(where, limit, offset);
  },
  ["member-campaigns"],
  { revalidate: 60, tags: ["campaigns"] },
);

// Uncached: search terms vary per keystroke, so caching each one is low value
// and would bloat the cache. The library is small, so a direct query is fast.
async function searchMemberCampaigns(filter: string | null, liveOnly: boolean, q: string, limit: number, offset: number) {
  const where = await buildMemberCampaignWhere(filter, liveOnly);
  (where.AND as Record<string, unknown>[]).push(campaignSearchClause(q));
  return runCampaignQuery(where, limit, offset);
}

function makeSlug(brandName: string, title: string): string {
  return `${brandName}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Filter label → campaignType slug (new campaigns)
const FILTER_TO_CAMPAIGN_TYPE: Record<string, string> = {
  "PR / Gifted":  "pr-gifted",
  Paid:           "paid",
  TikTok:         "tiktok",
  "App Partners": "app-partners",
  Events:         "event",
};

// Filter label → legacy postType label (old campaigns)
const FILTER_TO_POST_TYPE: Record<string, string> = {
  "PR / Gifted":  "PR / Gifted",
  Paid:           "Paid Collab",
  TikTok:         "TikTok Commission",
  "App Partners": "App Partners",
  Events:         "Event",
};

// Filter label → section slug (catches campaigns assigned to section but missing type fields)
const FILTER_TO_SECTION_SLUG: Record<string, string> = {
  "PR / Gifted":  "pr-gifted-campaigns",
  Paid:           "paid-collaborations",
  TikTok:         "tiktok-commission",
  "App Partners": "app-partners",
  Events:         "events",
};

export async function GET(req: NextRequest) {
  const session = await getPayingSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter   = searchParams.get("filter");
  const adminAll = searchParams.get("adminAll") && session.user.isAdmin ? searchParams.get("adminAll") : null;
  const q        = searchParams.get("q")?.trim() || null;
  const { limit, offset } = parsePaging(searchParams);

  try {
    // Flip any due scheduled campaigns/content live before reading
    // (self-throttled to once/60s per instance)
    await publishDueScheduled().catch(() => {});

    // Members get the cached opportunities feed (same for everyone). A search
    // term takes the uncached search path so it covers the WHOLE library, not
    // just the loaded page.
    if (!adminAll) {
      const { campaigns, total } = q
        ? await searchMemberCampaigns(filter, !!searchParams.get("live"), q, limit, offset)
        : await getMemberCampaigns(filter, !!searchParams.get("live"), limit, offset);
      // The member opportunities feed is identical for every member (no
      // per-user fields — likedByMe lives on the single-campaign route). So a
      // short PRIVATE (browser-only) cache is safe: a shared/CDN cache is never
      // involved, so one member's response can never reach another, and the
      // data is already 60s-stale-tolerant via unstable_cache.
      return NextResponse.json(
        { campaigns, total, limit, offset, hasMore: offset + campaigns.length < total },
        { headers: { "Cache-Control": "private, max-age=30" } },
      );
    }

    // Admin: uncached, sees every campaign incl. drafts. The type filter and
    // search term apply to BOTH the list and the tab counts; the status tab
    // narrows only the list (so each tab badge still shows its true total).
    const baseAnd: Record<string, unknown>[] = [];
    if (filter && FILTER_TO_CAMPAIGN_TYPE[filter]) {
      const filterSection = await prisma.section.findUnique({
        where: { slug: FILTER_TO_SECTION_SLUG[filter] },
        select: { id: true },
      });
      const orConditions: Record<string, unknown>[] = [
        { campaignType: FILTER_TO_CAMPAIGN_TYPE[filter] },
        { postType: FILTER_TO_POST_TYPE[filter] },
      ];
      if (filterSection) orConditions.push({ sectionId: filterSection.id });
      baseAnd.push({ OR: orConditions });
    }
    if (q) baseAnd.push(campaignSearchClause(q));
    const baseWhere = baseAnd.length ? { AND: baseAnd } : {};

    const adminStatus = searchParams.get("status");
    const listWhere = adminStatus ? { AND: [...baseAnd, { status: adminStatus }] } : baseWhere;

    const [{ campaigns, total }, grouped] = await Promise.all([
      runCampaignQuery(listWhere, limit, offset),
      // Per-status counts for the tab badges — the whole library, ignoring the
      // active tab so every badge stays accurate however you page/filter.
      prisma.post.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    ]);
    const counts: Record<string, number> = { All: 0 };
    for (const g of grouped) {
      counts[g.status] = g._count._all;
      counts.All += g._count._all;
    }

    return NextResponse.json({ campaigns, total, limit, offset, hasMore: offset + campaigns.length < total, counts });
  } catch (err) {
    console.error("[GET /api/campaigns]", err);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate types, lengths and image origins before use. Gate only — the
    // code below keeps doing its own coercion/sanitisation on `body`.
    const valid = parseJson(campaignWriteSchema, body);
    if (!valid.ok) return valid.response;

    const {
      title, brandName, brandDescription, opportunityDescription,
      deliverables, brandWebsite, brandInstagram, brandTikTok,
      applyLinkUrl, spotsRemaining, sectionSlug, campaignType, status,
      coverImageUrl, brandLogoUrl, scheduledAt,
      paymentAmount, paymentTerms, eventDate, eventTime, eventLocation,
    } = body;

    // opportunityDescription is rendered as HTML on the campaign page
    // (dangerouslySetInnerHTML), so it MUST be sanitised before storage —
    // otherwise a compromised admin could persist XSS to every member.
    const safeDescription = opportunityDescription
      ? sanitizeRichText(opportunityDescription)
      : null;

    if (!title || !brandName || !sectionSlug) {
      return NextResponse.json({ error: "title, brandName, and sectionSlug are required" }, { status: 400 });
    }

    if (status === "schedule" && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      return NextResponse.json({ error: "A future date and time is required to schedule" }, { status: 400 });
    }

    const section = await prisma.section.findUnique({ where: { slug: sectionSlug } });
    if (!section) {
      return NextResponse.json({ error: `Section '${sectionSlug}' not found` }, { status: 400 });
    }

    const admin = await prisma.creator.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    if (!admin) return NextResponse.json({ error: "Author not found" }, { status: 400 });

    const baseSlug = makeSlug(brandName, title);
    const existingSlug = await prisma.post.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Map campaignType slug → display label for postType
    const POST_TYPE_LABEL: Record<string, string> = {
      "pr-gifted":   "PR / Gifted",
      paid:          "Paid Collab",
      event:         "Event",
      "app-partners": "App Partners",
      tiktok:        "TikTok Commission",
    };

    const post = await prisma.post.create({
      data: {
        title,
        body:                   safeDescription ?? "",
        brandName,
        brandDescription:       brandDescription ?? null,
        opportunityDescription: safeDescription,
        deliverables:           deliverables ?? null,
        brandWebsite:           brandWebsite || null,
        brandInstagram:         brandInstagram || null,
        brandTikTok:            brandTikTok || null,
        applyLinkUrl:           applyLinkUrl || null,
        spotsRemaining:         spotsRemaining ? parseInt(spotsRemaining) : null,
        coverImageUrl:          coverImageUrl || null,
        brandLogoUrl:           brandLogoUrl || null,
        campaignType:           campaignType ?? "pr-gifted",
        postType:               POST_TYPE_LABEL[campaignType] ?? campaignType ?? "PR / Gifted",
        paymentAmount:          paymentAmount || null,
        paymentTerms:           paymentTerms || null,
        eventDate:              eventDate ? new Date(eventDate) : null,
        eventTime:              eventTime || null,
        eventLocation:          eventLocation || null,
        status:                 status === "publish" ? "published" : status === "schedule" ? "scheduled" : "draft",
        scheduledAt:            status === "schedule" && scheduledAt ? new Date(scheduledAt) : null,
        publishedAt:            status === "publish" ? new Date() : null,
        slug,
        sectionId:              section.id,
        authorId:               admin.id,
      },
    });

    // Bust the members' cached opportunities feed so it shows immediately
    revalidateTag("campaigns");

    // Notify every active creator when a campaign goes live on creation
    if (post.status === "published") {
      await notifyAllCreators({
        type: "campaign",
        title: "New opportunity live",
        description: `${post.brandName ?? "A brand"} — ${post.title}`,
        referenceId: post.slug,
      }).catch(err => console.error("[notify campaign publish]", err));
    }

    await logAudit({
      actorId: session.user.id,
      action: `Created campaign (${post.status})`,
      detail: `${post.brandName ?? ""} — ${post.title}`,
      targetType: "campaign",
      targetId: post.id,
    });

    return NextResponse.json({ campaign: { id: post.id, slug: post.slug } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/campaigns]", err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
