import { parseJson, contentWriteSchema } from '@/lib/validation';
import type { PostContent } from '@prisma/client';
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getPayingSession } from "@/lib/session";
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
  const session = await getPayingSession();
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
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const valid = parseJson(contentWriteSchema, body);
    if (!valid.ok) return valid.response;
    const input = valid.data as Record<string, unknown>;

    // Build the update from keys ACTUALLY PRESENT in the request. Prisma reads
    // `undefined` as "leave this column alone" and `null` as "set it to null",
    // so the old unconditional object turned every omitted field into an
    // explicit null — a partial PATCH (a status toggle, a sortOrder nudge, a
    // future mobile client sending only changed fields) silently wiped the
    // body, PDF, thumbnail and categories, with no soft-delete or history to
    // recover from. Presence is the signal: absent = untouched; explicit null
    // (all these fields are .nullable() in the schema) = deliberately cleared.
    const has = (k: string) => k in input;
    const data: Record<string, unknown> = {};

    // Plain scalars: copy through when present.
    for (const k of ['title', 'contentType', 'section', 'status'] as const) {
      if (has(k)) data[k] = input[k];
    }
    // Nullable fields: an explicit null clears them; absence leaves them.
    for (const k of [
      'pdfUrl', 'editableTemplateUrl', 'videoEmbedUrl', 'videoTranscript',
      'thumbnailUrl', 'bannerImageUrl',
    ] as const) {
      if (has(k)) data[k] = input[k] ?? null;
    }
    // categories is a non-nullable list column; null/absent-when-present -> [].
    if (has('categories')) data.categories = input.categories ?? [];
    // sortOrder defaults to 0 only when explicitly sent as null.
    if (has('sortOrder')) data.sortOrder = input.sortOrder ?? 0;
    if (has('scheduledAt')) {
      data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt as string) : null;
    }
    // body is sanitised, and reading time is recomputed to stay consistent with
    // it — but only when body is part of this request, so a partial edit never
    // resets it. Clearing the body (explicit null/empty) zeroes reading time.
    if (has('body')) {
      const raw = input.body as string | null | undefined;
      data.body = raw ? sanitizeRichText(raw) : null;
      data.readingTimeMinutes = raw ? calculateReadingTime(raw) : 0;
    }

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

    // Optimistic concurrency: when the client sends the version it read, match
    // on (id, version) via updateMany and bump the version. A stale copy
    // updates zero rows, so a second admin saving over the first is told (409),
    // not silently allowed. `update` can't be used here — its `where` only
    // accepts unique fields, and version isn't unique. Absent version = legacy
    // caller, plain id-only update as before.
    const clientVersion = input.version;
    let item: PostContent | null;
    if (typeof clientVersion === 'number') {
      data.version = { increment: 1 };
      const { count } = await prisma.postContent.updateMany({
        where: { id: params.id, version: clientVersion },
        data,
      });
      if (count === 0) {
        // Zero rows = either the row is gone (404) or the version moved (409).
        const exists = await prisma.postContent.findUnique({
          where: { id: params.id },
          select: { id: true },
        });
        if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(
          { error: 'This item was changed by someone else since you opened it. Reload to see the latest version before saving again.' },
          { status: 409 },
        );
      }
      item = await prisma.postContent.findUnique({ where: { id: params.id } });
    } else {
      item = await prisma.postContent.update({ where: { id: params.id }, data });
    }
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Bust the members' cached content list so edits show immediately
    revalidateTag("content");

    if (firstPublish) {
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
  const session = await getPayingSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const item = await prisma.postContent.findUnique({
      where: { id: params.id },
      select: { title: true, section: true },
    });
    await prisma.postContent.delete({ where: { id: params.id } });
    revalidateTag("content");
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
