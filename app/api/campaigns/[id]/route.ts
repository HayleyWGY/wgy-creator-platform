import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSession } from "@/lib/session";
import { notifyAllCreators } from "@/lib/notify";

const POST_TYPE_LABEL: Record<string, string> = {
  "pr-gifted":    "PR / Gifted",
  paid:           "Paid Collab",
  event:          "Event",
  "app-partners": "App Partners",
  tiktok:         "TikTok Commission",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const post = await prisma.post.findFirst({
      where: { OR: [{ slug: id }, { id }] },
      include: { section: { select: { name: true, slug: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const campaign = {
      id:                    post.id,
      slug:                  post.slug ?? post.id,
      brandName:             post.brandName ?? "",
      brandInitials:         (post.brandName ?? "??").slice(0, 2).toUpperCase(),
      brandLogoUrl:          post.brandLogoUrl,
      coverImageUrl:         post.coverImageUrl,
      campaignType:          post.campaignType ?? post.postType,
      title:                 post.title,
      brandDescription:      post.brandDescription,
      brandWebsite:          post.brandWebsite,
      brandInstagram:        post.brandInstagram,
      brandTikTok:           post.brandTikTok,
      opportunityDescription: post.opportunityDescription,
      deliverables:          post.deliverables as string[] | null,
      applyLinkUrl:          post.applyLinkUrl ?? "",
      spotsRemaining:        post.spotsRemaining,
      paymentAmount:         post.paymentAmount,
      paymentTerms:          post.paymentTerms,
      eventDate:             post.eventDate,
      eventTime:             post.eventTime,
      eventLocation:         post.eventLocation,
      likesCount:            post.likesCount,
      commentsCount:         post.commentsCount,
      status:                post.status,
      createdAt:             post.createdAt,
      sectionName:           post.section.name,
      sectionSlug:           post.section.slug,
    };

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("[GET /api/campaigns/[id]]", err);
    return NextResponse.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getActiveSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      status,
      title, brandName, brandDescription, opportunityDescription,
      deliverables, brandWebsite, brandInstagram, brandTikTok,
      applyLinkUrl, spotsRemaining, sectionSlug, campaignType,
      coverImageUrl, brandLogoUrl,
      paymentAmount, paymentTerms, eventDate, eventTime, eventLocation,
    } = body;

    const data: Record<string, unknown> = {};

    // Status-only update (Close / Publish from list)
    if (status === "published" && !title) {
      data.status = "published";
      data.publishedAt = new Date();
    } else if (status === "closed" && !title) {
      data.status = "closed";
    } else if (status === "draft" && !title) {
      data.status = "draft";
    }

    // Full field update (from edit form)
    if (title) {
      data.title                 = title;
      data.body                  = opportunityDescription ?? "";
      data.brandName             = brandName ?? null;
      data.brandDescription      = brandDescription ?? null;
      data.opportunityDescription = opportunityDescription ?? null;
      data.deliverables          = deliverables ?? null;
      data.brandWebsite          = brandWebsite || null;
      data.brandInstagram        = brandInstagram || null;
      data.brandTikTok           = brandTikTok || null;
      data.applyLinkUrl          = applyLinkUrl || null;
      data.spotsRemaining        = spotsRemaining ? parseInt(spotsRemaining) : null;
      data.campaignType          = campaignType ?? "pr-gifted";
      data.postType              = POST_TYPE_LABEL[campaignType] ?? campaignType ?? "PR / Gifted";
      data.paymentAmount         = paymentAmount || null;
      data.paymentTerms          = paymentTerms || null;
      data.eventDate             = eventDate ? new Date(eventDate) : null;
      data.eventTime             = eventTime || null;
      data.eventLocation         = eventLocation || null;
      if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl || null;
      if (brandLogoUrl !== undefined)  data.brandLogoUrl  = brandLogoUrl || null;

      if (status === "publish") {
        data.status      = "published";
        data.publishedAt = new Date();
      } else if (status === "draft") {
        data.status = "draft";
      }

      if (sectionSlug) {
        const section = await prisma.section.findUnique({ where: { slug: sectionSlug } });
        if (section) data.sectionId = section.id;
      }
    }

    // Capture the previous status so we only notify on the draft→published transition
    const before = await prisma.post.findUnique({ where: { id }, select: { status: true } });
    const post = await prisma.post.update({ where: { id }, data });

    if (before?.status !== "published" && post.status === "published") {
      notifyAllCreators({
        type: "campaign",
        title: "New opportunity live",
        description: `${post.brandName ?? "A brand"} — ${post.title}`,
        referenceId: post.slug,
      }).catch(err => console.error("[notify campaign publish]", err));
    }

    return NextResponse.json({ campaign: { id: post.id, slug: post.slug, status: post.status } });
  } catch (err) {
    console.error("[PATCH /api/campaigns/[id]]", err);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
