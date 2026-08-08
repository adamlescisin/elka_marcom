import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import * as fs from "fs/promises";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const image = await prisma.generatedImage.findUnique({ where: { id } });
  if (!image) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  // Delete file from disk (best-effort)
  try { await fs.unlink(image.path); } catch {}

  await prisma.generatedImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
