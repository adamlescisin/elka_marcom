import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { renderContentImage, defaultBrandColors } from "@/services/image-renderer";
import type { ProductBadge } from "@/services/image-renderer";
import { fetchWooProduct } from "@/services/woocommerce";
import type { GeneratedCopy, BrandDNA } from "@/types/brand";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { brand: true } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  let copy: GeneratedCopy;
  let dna: BrandDNA;
  let uploadedAssets: { path: string }[] = [];

  try {
    copy = JSON.parse(content.copy);
    dna = JSON.parse(content.brand.dna);
    if (content.uploadedAssets) uploadedAssets = JSON.parse(content.uploadedAssets);
  } catch {
    return NextResponse.json({ error: "Chyba parsování dat." }, { status: 500 });
  }

  const brandColors = defaultBrandColors(dna);
  const photoPath = uploadedAssets[0]?.path;

  // When no uploaded photo but a product URL exists, fetch product image + badge
  let photoUrl: string | undefined;
  let productBadge: ProductBadge | undefined;

  if (!photoPath && content.sourceUrl && content.brand.wooBaseUrl) {
    const product = await fetchWooProduct(
      content.sourceUrl,
      content.brand.wooBaseUrl,
      process.env.WOO_CONSUMER_KEY ?? "",
      process.env.WOO_CONSUMER_SECRET ?? ""
    );
    if (product) {
      photoUrl = product.images[0]?.src;
      const priceFormatted = (p: string) => p ? `${Number(p).toLocaleString("cs-CZ")} Kč` : "";
      productBadge = {
        name: product.name,
        price: priceFormatted(product.sale_price || product.price),
        originalPrice: product.on_sale && product.regular_price
          ? priceFormatted(product.regular_price)
          : undefined,
      };
    }
  }

  try {
    const result = await renderContentImage({
      format: content.format,
      copy,
      brandName: content.brand.name,
      brandColors,
      photoPath,
      photoUrl,
      productBadge,
    });

    // Save generated assets back to content
    const assets = result.paths.map((p, i) => ({
      type: "image",
      path: p,
      url: result.urls[i],
    }));

    await prisma.content.update({
      where: { id },
      data: { assets: JSON.stringify(assets) },
    });

    return NextResponse.json({ ok: true, urls: result.urls, assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba renderování.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
