import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateReadingTime } from "@/lib/reading-time";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const contentType = searchParams.get("contentType");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (status) where.status = status;
  if (contentType) where.contentType = contentType;

  const items = await prisma.postContent.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const readingTimeMinutes = body.body ? calculateReadingTime(body.body) : null;

  const item = await prisma.postContent.create({
    data: {
      title: body.title,
      contentType: body.contentType,
      body: body.body ?? null,
      pdfUrl: body.pdfUrl ?? null,
      editableTemplateUrl: body.editableTemplateUrl ?? null,
      videoEmbedUrl: body.videoEmbedUrl ?? null,
      videoTranscript: body.videoTranscript ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      bannerImageUrl: body.bannerImageUrl ?? null,
      section: body.section,
      categories: body.categories ?? [],
      status: body.status ?? "draft",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      publishedAt: body.status === "published" ? new Date() : null,
      authorId: body.authorId ?? session.user.id,
      sortOrder: body.sortOrder ?? 0,
      readingTimeMinutes,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
