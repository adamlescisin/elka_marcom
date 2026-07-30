import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateContent } from "@/services/brief-builder";
import type { BrandDNA, ContentFormat, ContentObjective } from "@/types/brand";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { brand: true } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  let dna: BrandDNA;
  let goldExamples: { format: string; text: string }[] = [];
  try {
    dna = JSON.parse(content.brand.dna);
    goldExamples = JSON.parse(content.brand.goldExamples);
  } catch {
    return NextResponse.json({ error: "Chyba Brand DNA." }, { status: 500 });
  }

  const newCopy = await generateContent({
    brand: { dna, goldExamples },
    format: content.format as ContentFormat,
    objective: content.objective as ContentObjective,
    briefPrompt: content.briefPrompt,
  });

  const revisions = JSON.parse(content.revisions);
  revisions.push({
    timestamp: new Date().toISOString(),
    field: "reroll",
    before: JSON.parse(content.copy),
    after: newCopy,
  });

  await prisma.content.update({
    where: { id },
    data: {
      copy: JSON.stringify(newCopy),
      revisions: JSON.stringify(revisions),
    },
  });

  return NextResponse.json({ ok: true, copy: newCopy });
}
