import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { publishToMeta } from "@/services/meta-publisher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { brand: true } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  if (!["approved", "draft"].includes(content.status)) {
    return NextResponse.json(
      { error: "Obsah musí být schválen před zveřejněním." },
      { status: 400 }
    );
  }

  try {
    const result = await publishToMeta(content);
    await prisma.content.update({
      where: { id },
      data: {
        status: "posted",
        postedAt: new Date(),
        metaResult: JSON.stringify(result),
      },
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba zveřejnění.";
    await prisma.content.update({ where: { id }, data: { status: "failed" } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
