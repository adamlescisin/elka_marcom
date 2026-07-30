import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) return NextResponse.json({ error: "Nenalezena." }, { status: 404 });

  return NextResponse.json(brand);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { slug } = await params;
  const body = await request.json();

  const updates: Record<string, string> = {};
  if (body.dna) updates.dna = JSON.stringify(body.dna);
  if (body.goldExamples) updates.goldExamples = JSON.stringify(body.goldExamples);
  if (body.metaPageId) updates.metaPageId = body.metaPageId;
  if (body.igUserId) updates.igUserId = body.igUserId;

  const brand = await prisma.brand.update({ where: { slug }, data: updates });
  return NextResponse.json(brand);
}
