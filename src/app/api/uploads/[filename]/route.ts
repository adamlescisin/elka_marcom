import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" :
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      "application/octet-stream";

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
