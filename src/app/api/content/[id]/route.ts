import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { brand: true } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  return NextResponse.json(content);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.content.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  const updates: Record<string, unknown> = {};

  if (body.copy) {
    // Record revision
    const revisions = JSON.parse(existing.revisions);
    revisions.push({
      timestamp: new Date().toISOString(),
      field: "copy",
      before: JSON.parse(existing.copy),
      after: body.copy,
    });
    updates.copy = JSON.stringify(body.copy);
    updates.revisions = JSON.stringify(revisions);
  }

  if (body.status) updates.status = body.status;
  if (body.scheduledFor) updates.scheduledFor = new Date(body.scheduledFor);
  if (body.assets) updates.assets = JSON.stringify(body.assets);

  const updated = await prisma.content.update({ where: { id }, data: updates });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  await prisma.content.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
