import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSession } from "@/lib/session";

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
  const { searchParams } = new URL(req.url);
  const filter   = searchParams.get("filter");
  const adminAll = searchParams.get("adminAll");
  const limit    = parseInt(searchParams.get("limit") ?? "50");

  try {
    const where: Record<string, unknown> = {};

    if (!adminAll) {
      where.status = "published";
    }

    if (filter && FILTER_TO_CAMPAIGN_TYPE[filter]) {
      // Look up the section ID for this filter type so we can match by sectionId in the OR
      const filterSection = await prisma.section.findUnique({
        where: { slug: FILTER_TO_SECTION_SLUG[filter] },
        select: { id: true },
      });

      const orConditions: Record<string, unknown>[] = [
        { campaignType: FILTER_TO_CAMPAIGN_TYPE[filter] },
        { postType: FILTER_TO_POST_TYPE[filter] },
      ];
      // Also match by section (catches campaigns assigned to section but with wrong/missing type fields)
      if (filterSection) {
        orConditions.push({ sectionId: filterSection.id });
      }
      where.OR = orConditions;
    }

    if (!adminAll) {
      const opportunitySections = await prisma.section.findMany({
        where: { group: "OPPORTUNITIES" },
        select: { id: true },
      });
      // If no sections are tagged OPPORTUNITIES, skip the section constraint entirely
      if (opportunitySections.length > 0) {
        where.sectionId = { in: opportunitySections.map((s: { id: string }) => s.id) };
      }
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { section: { select: { name: true, slug: true } } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaigns = posts.map((p: any) => ({
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
      status:                p.status,
      createdAt:             p.createdAt,
      sectionName:           p.section.name,
      sectionSlug:           p.section.slug,
    }));

    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("[GET /api/campaigns]", err);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title, brandName, brandDescription, opportunityDescription,
      deliverables, brandWebsite, brandInstagram, brandTikTok,
      applyLinkUrl, spotsRemaining, sectionSlug, campaignType, status,
      coverImageUrl, brandLogoUrl,
      paymentAmount, paymentTerms, eventDate, eventTime, eventLocation,
    } = body;

    if (!title || !brandName || !sectionSlug) {
      return NextResponse.json({ error: "title, brandName, and sectionSlug are required" }, { status: 400 });
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
        body:                   opportunityDescription ?? "",
        brandName,
        brandDescription:       brandDescription ?? null,
        opportunityDescription: opportunityDescription ?? null,
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
        status:                 status === "publish" ? "published" : "draft",
        publishedAt:            status === "publish" ? new Date() : null,
        slug,
        sectionId:              section.id,
        authorId:               admin.id,
      },
    });

    return NextResponse.json({ campaign: { id: post.id, slug: post.slug } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/campaigns]", err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
