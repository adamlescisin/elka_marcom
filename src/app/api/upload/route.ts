import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const formData = await request.formData();
  const contentId = formData.get("contentId") as string | null;
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "Žádné soubory." }, { status: 400 });
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const saved: { path: string; url: string; name: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
      continue;
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE) continue;

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${uuid()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, Buffer.from(bytes));
    saved.push({ path: filePath, url: `/api/uploads/${filename}`, name: file.name });
  }

  // If contentId provided, attach to content record
  if (contentId && saved.length > 0) {
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (content) {
      let existing: { path: string; url: string; name: string }[] = [];
      try {
        existing = JSON.parse(content.uploadedAssets ?? "[]");
      } catch {}

      await prisma.content.update({
        where: { id: contentId },
        data: { uploadedAssets: JSON.stringify([...existing, ...saved]) },
      });
    }
  }

  return NextResponse.json({ ok: true, files: saved });
}
