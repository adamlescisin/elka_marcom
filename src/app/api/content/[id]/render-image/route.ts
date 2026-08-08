import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { renderContentImage, defaultBrandColors } from "@/services/image-renderer";
import type { ProductBadge } from "@/services/image-renderer";
import { fetchWooProduct } from "@/services/woocommerce";
import * as cheerio from "cheerio";
import type { GeneratedCopy, BrandDNA } from "@/types/brand";

interface ScrapeResult {
  imageUrl: string | null;
  status?: number;
  error?: string;
}

async function scrapeProductImage(url: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { imageUrl: null, status: res.status, error: `HTTP ${res.status}` };
    const html = await res.text();
    const $ = cheerio.load(html);
    const imageUrl =
      $('meta[property="og:image"]').attr("content") ??
      $('meta[property="og:image:url"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      $('meta[name="twitter:image:src"]').attr("content") ??
      // WooCommerce product gallery — first full-size image
      $('.woocommerce-product-gallery__image a').first().attr("href") ??
      null;
    return { imageUrl, status: res.status };
  } catch (e) {
    return { imageUrl: null, error: e instanceof Error ? e.message : String(e) };
  }
}

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
  let scrapeResult: ScrapeResult | null = null;

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
      photoUrl = scrapeResult.imageUrl ?? undefined;
    }
  }

  // Verify the photo file is actually readable
  let photoFileSize: number | null = null;
  let photoReadError: string | null = null;
  if (photoPath) {
    try {
      const stat = await import("fs/promises").then(m => m.stat(photoPath));
      photoFileSize = stat.size;
    } catch (e) {
      photoReadError = e instanceof Error ? e.message : String(e);
    }
  }

  // Temporary: surface product-fetch diagnostics in response
  const _diag = {
    uploadedAssetsCount: uploadedAssets.length,
    photoPath: photoPath ?? null,
    photoFileSize,
    photoReadError,
    hasUploadedPhoto: !!photoPath,
    sourceUrl: content.sourceUrl,
    wooBaseUrl: content.brand.wooBaseUrl,
    resolvedPhotoUrl: photoUrl ?? null,
    hasProductBadge: !!productBadge,
    scrape: scrapeResult,
  };

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

    return NextResponse.json({ ok: true, urls: result.urls, assets, _diag });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chyba renderování.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
