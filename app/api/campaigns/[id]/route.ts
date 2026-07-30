import { parseJson, campaignWriteSchema } from '@/lib/validation';
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPayingSession } from "@/lib/session";
import { notifyAllCreators } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { sanitizeRichText } from "@/lib/sanitize";

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

  const session = await getPayingSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const post = await prisma.post.findFirst({
      where: { OR: [{ slug: id }, { id }] },
      include: { section: { select: { name: true, slug: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Drafts and scheduled campaigns are only visible to admins;
    // published and closed campaigns stay browsable for everyone.
    if ((post.status === "draft" || post.status === "scheduled") && !session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Whether the current viewer has liked this campaign
    const likedByMe = session?.user?.id
      ? !!(await prisma.like.findUnique({
          where: { creatorId_postId: { creatorId: session.user.id, postId: post.id } },
        }))
      : false;

    const campaign = {
      likedByMe,
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
      scheduledAt:           post.scheduledAt,
      version:               post.version,
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
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const valid = parseJson(campaignWriteSchema, body);
    if (!valid.ok) return valid.response;

    const {
      status,
      title, brandName, brandDescription, opportunityDescription,
      deliverables, brandWebsite, brandInstagram, brandTikTok,
      applyLinkUrl, spotsRemaining, sectionSlug, campaignType,
      coverImageUrl, brandLogoUrl, scheduledAt,
      paymentAmount, paymentTerms, eventDate, eventTime, eventLocation,
    } = body;

    // Explicit intent, replacing the old `if (title)` inference. "full" = edit
    // form, anything else = a list status toggle. When the client sends `mode`
    // we trust it; when it doesn't (legacy caller) we fall back to the old
    // title-presence guess so nothing breaks mid-migration.
    const { mode, version: clientVersion } = valid.data as { mode?: 'status' | 'full'; version?: number };
    const isFullEdit = mode ? mode === 'full' : Boolean(title);

    // Defect 2: a full edit that cleared the title used to fall through both
    // branches and save nothing — a silent no-op that looked like a lost save.
    // Now it's an explicit 400 the form can surface on the title field.
    if (isFullEdit && !title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (status === "schedule" && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      return NextResponse.json({ error: "A future date and time is required to schedule" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    // Status-only update (Close / Publish from list)
    if (!isFullEdit && status === "published") {
      data.status = "published";
      data.publishedAt = new Date();
      data.scheduledAt = null;
    } else if (!isFullEdit && status === "closed") {
      data.status = "closed";
    } else if (!isFullEdit && status === "draft") {
      data.status = "draft";
    } else if (!isFullEdit && status === "schedule") {
      data.status = "scheduled";
      data.scheduledAt = new Date(scheduledAt);
    }

    // Full field update (from edit form)
    if (isFullEdit) {
      // opportunityDescription is rendered as HTML on the campaign page, so
      // sanitise before storage (see the create route for the same guard).
      const safeDescription = opportunityDescription
        ? sanitizeRichText(opportunityDescription)
        : null;

      data.title                 = title;
      data.body                  = safeDescription ?? "";
      data.brandName             = brandName ?? null;
      data.brandDescription      = brandDescription ?? null;
      data.opportunityDescription = safeDescription;
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
        data.scheduledAt = null;
      } else if (status === "draft") {
        data.status = "draft";
        data.scheduledAt = null;
      } else if (status === "schedule") {
        data.status      = "scheduled";
        data.scheduledAt = new Date(scheduledAt);
      }

      if (sectionSlug) {
        const section = await prisma.section.findUnique({ where: { slug: sectionSlug } });
        if (section) data.sectionId = section.id;
      }
    }

    // Capture the previous status so we only notify on the draft→published transition
    const before = await prisma.post.findUnique({ where: { id }, select: { status: true } });

    // Optimistic concurrency: when the client sends the version it read, match
    // on (id, version) via updateMany and bump it. A stale copy updates zero
    // rows -> 409, so the second admin to save is told rather than silently
    // overwriting the first. `update` can't be used (its `where` needs a unique
    // field; version isn't). Absent version = legacy caller, id-only update.
    let post;
    if (typeof clientVersion === 'number') {
      data.version = { increment: 1 };
      const { count } = await prisma.post.updateMany({
        where: { id, version: clientVersion },
        data,
      });
      if (count === 0) {
        const exists = await prisma.post.findUnique({ where: { id }, select: { id: true } });
        if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(
          { error: "This campaign was changed by someone else since you opened it. Reload to see the latest version before saving again." },
          { status: 409 },
        );
      }
      post = await prisma.post.findUnique({ where: { id } });
      if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    } else {
      post = await prisma.post.update({ where: { id }, data });
    }

    // Bust the members' cached opportunities feed (new/edited/closed status)
    revalidateTag("campaigns");

    if (before?.status !== "published" && post.status === "published") {
      notifyAllCreators({
        type: "campaign",
        title: "New opportunity live",
        description: `${post.brandName ?? "A brand"} — ${post.title}`,
        referenceId: post.slug,
      }).catch(err => console.error("[notify campaign publish]", err));
    }

    await logAudit({
      actorId: session.user.id,
      action: isFullEdit
        ? `Edited campaign (${post.status})`
        : `Set campaign status to ${post.status}`,
      detail: `${post.brandName ?? ""} — ${post.title}`,
      targetType: "campaign",
      targetId: post.id,
    });

    return NextResponse.json({ campaign: { id: post.id, slug: post.slug, status: post.status } });
  } catch (err) {
    console.error("[PATCH /api/campaigns/[id]]", err);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
