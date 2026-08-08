import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { renderContentImage, defaultBrandColors } from "@/services/image-renderer";
import type { ProductBadge } from "@/services/image-renderer";
import { fetchWooProduct } from "@/services/woocommerce";
import { scrapeProductImage } from "@/services/scrape-product-image";
import type { GeneratedCopy, BrandDNA, BrandStyle } from "@/types/brand";

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
  let contentStyleOverrides: BrandStyle = {};

  try {
    copy = JSON.parse(content.copy);
    dna = JSON.parse(content.brand.dna);
    if (content.uploadedAssets) uploadedAssets = JSON.parse(content.uploadedAssets);
    if (content.styleOverrides) contentStyleOverrides = JSON.parse(content.styleOverrides);
  } catch {
    return NextResponse.json({ error: "Chyba parsování dat." }, { status: 500 });
  }

  const brandColors = defaultBrandColors(dna);
  // Merge: brand-level style defaults, then per-post overrides on top
  const style: BrandStyle = { ...dna.style, ...contentStyleOverrides };
  const photoPath = uploadedAssets[0]?.path;
  const photoPaths = uploadedAssets.map((a) => a.path);

  // When no uploaded photo but a product URL exists, fetch product image + badge
  let photoUrl: string | undefined;
  let productBadge: ProductBadge | undefined;
  let scrapeResult: string | null = null;

  if (!photoPath && content.sourceUrl) {
    if (content.brand.wooBaseUrl) {
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
    // Fallback: scrape og:image from the product page when no WooCommerce API or no image found
    if (!photoUrl) {
      scrapeResult = await scrapeProductImage(content.sourceUrl);
      photoUrl = scrapeResult ?? undefined;
    }
  }

  // Verify all uploaded asset paths are readable
  const fsp = await import("fs/promises");
  const uploadedAssetsDiag = await Promise.all(
    uploadedAssets.map(async (a, i) => {
      try {
        const stat = await fsp.stat(a.path);
        return { i, path: a.path, size: stat.size, ok: true };
      } catch (e) {
        return { i, path: a.path, size: null, ok: false, err: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  // Temporary: surface product-fetch diagnostics in response
  const _diag = {
    uploadedAssetsCount: uploadedAssets.length,
    uploadedAssetsDiag,
    hasUploadedPhoto: !!photoPath,
    sourceUrl: content.sourceUrl,
    wooBaseUrl: content.brand.wooBaseUrl,
    resolvedPhotoUrl: photoUrl ?? null,
    hasProductBadge: !!productBadge,
    scrapeResult,
  };

  try {
    const result = await renderContentImage({
      format: content.format,
      copy,
      brandName: content.brand.name,
      brandColors,
      photoPath,
      photoPaths: photoPaths.length > 1 ? photoPaths : undefined,
      photoUrl,
      productBadge,
      style: Object.keys(style).length > 0 ? style : undefined,
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

    return NextResponse.json({ ok: true, urls: result.urls, assets, _diag });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba renderování.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
