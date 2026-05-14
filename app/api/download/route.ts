import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only allow Cloudinary URLs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!parsed.hostname.endsWith("cloudinary.com")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Extract resource_type and public_id from URL
  // Format: /cloud_name/resource_type/upload/[v123/]public_id.ext
  const pathMatch = parsed.pathname.match(/^\/[^/]+\/(raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/);

  if (pathMatch) {
    const resourceType = pathMatch[1] as "raw" | "image" | "video";
    const publicIdWithExt = pathMatch[2]; // e.g. "wgy-campaigns/myfile.pdf"

    // Generate a signed delivery URL — works even with authenticated delivery enabled
    const signedUrl = cloudinary.url(publicIdWithExt, {
      resource_type: resourceType,
      sign_url: true,
      secure: true,
      type: "upload",
    });

    return NextResponse.redirect(signedUrl);
  }

  // Fallback: try to proxy directly
  const upstream = await fetch(url);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/pdf";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="download.pdf"`,
      "Content-Length": body.byteLength.toString(),
    },
  });
}
