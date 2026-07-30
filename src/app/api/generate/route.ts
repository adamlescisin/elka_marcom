import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { generateContent } from "@/services/brief-builder";
import { fetchWooProduct, formatProductForBrief } from "@/services/woocommerce";
import type { BrandDNA, ContentFormat, ContentObjective, GeneratedCopy } from "@/types/brand";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  try {
    const body = await request.json();
    const { brandId, format, objective, briefPrompt, sourceUrl, numSlides, seedContentId } = body;

    if (!brandId || !format || !objective || !briefPrompt) {
      return NextResponse.json({ error: "Chybí povinné parametry." }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) return NextResponse.json({ error: "Značka nenalezena." }, { status: 404 });

    let dna: BrandDNA;
    let goldExamples: { format: string; text: string }[] = [];
    try {
      dna = JSON.parse(brand.dna);
      goldExamples = JSON.parse(brand.goldExamples);
    } catch {
      return NextResponse.json({ error: "Chyba Brand DNA." }, { status: 500 });
    }

    // Fetch product context for mimimami
    let productContext: string | undefined;
    if (sourceUrl && brand.kind === "ecommerce" && brand.wooBaseUrl) {
      const product = await fetchWooProduct(
        sourceUrl,
        brand.wooBaseUrl,
        process.env.WOO_CONSUMER_KEY ?? "",
        process.env.WOO_CONSUMER_SECRET ?? ""
      );
      if (product) productContext = formatProductForBrief(product);
    }

    // Fetch seed content
    let seedContent: { copy: GeneratedCopy; briefPrompt: string } | undefined;
    if (seedContentId) {
      const seed = await prisma.content.findUnique({ where: { id: seedContentId } });
      if (seed) {
        seedContent = {
          copy: JSON.parse(seed.copy),
          briefPrompt: seed.briefPrompt,
        };
      }
    }

    const copy = await generateContent({
      brand: { dna, goldExamples },
      format: format as ContentFormat,
      objective: objective as ContentObjective,
      briefPrompt,
      productContext,
      numSlides,
      seedContent,
    });

    const content = await prisma.content.create({
      data: {
        brandId,
        format,
        objective,
        briefPrompt,
        sourceUrl: sourceUrl ?? null,
        seedContentId: seedContentId ?? null,
        copy: JSON.stringify(copy),
        assets: "[]",
        status: "draft",
        revisions: JSON.stringify([
          {
            timestamp: new Date().toISOString(),
            field: "initial_generation",
            before: null,
            after: copy,
          },
        ]),
      },
    });

    return NextResponse.json({ contentId: content.id });
  } catch (err) {
    console.error("Generate error:", err);
    const message = err instanceof Error ? err.message : "Chyba generování.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
