import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { fal } from "@fal-ai/client";
import { scrapeProductImage } from "@/services/scrape-product-image";
import { fetchWooProduct } from "@/services/woocommerce";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";
import type { GeneratedCopy } from "@/types/brand";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function generateOne(
  prompt: string,
  refImageUrl: string | null
): Promise<{ remoteUrl: string; mode: "img2img" | "text2img" }> {
  if (refImageUrl) {
    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        prompt,
        image_url: refImageUrl,
        strength: 0.8,
        num_inference_steps: 28,
        num_images: 1,
        enable_safety_checker: true,
      },
    });
    const remoteUrl = (result.data as { images: { url: string }[] }).images[0]?.url;
    if (!remoteUrl) throw new Error("fal.ai nevrátilo obrázek (img2img).");
    return { remoteUrl, mode: "img2img" };
  } else {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
    });
    const remoteUrl = (result.data as { images: { url: string }[] }).images[0]?.url;
    if (!remoteUrl) throw new Error("fal.ai nevrátilo obrázek (text2img).");
    return { remoteUrl, mode: "text2img" };
  }
}

async function downloadAndSave(remoteUrl: string, prompt: string) {
  const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(30000) });
  if (!imgRes.ok) throw new Error(`Stažení obrázku selhalo: ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const ct = (imgRes.headers.get("content-type") ?? "image/png").split(";")[0].trim();
  const ext = ct === "image/jpeg" ? "jpg" : ct === "image/webp" ? "webp" : "png";
  const filename = `${uuid()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buf);
  return { path: filePath, url: `/api/uploads/${filename}`, name: prompt.slice(0, 80) };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY není nastaven v prostředí." }, { status: 500 });
  }

  fal.config({ credentials: falKey });

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { brand: true } });
  if (!content) return NextResponse.json({ error: "Nenalezeno." }, { status: 404 });

  const body = await request.json();
  const prompt: string = (body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "Chybí prompt." }, { status: 400 });

  // Determine how many images to generate (1 for single post, N for carousel)
  let count = 1;
  try {
    const copy = JSON.parse(content.copy) as GeneratedCopy;
    if (content.format === "carousel" && copy.carousel_slides?.length) {
      count = copy.carousel_slides.length;
    }
  } catch {}

  // Collect product image URLs from WooCommerce gallery or og:image scrape
  let productImageUrls: string[] = [];
  if (content.sourceUrl) {
    if (content.brand.wooBaseUrl) {
      const product = await fetchWooProduct(
        content.sourceUrl,
        content.brand.wooBaseUrl,
        process.env.WOO_CONSUMER_KEY ?? "",
        process.env.WOO_CONSUMER_SECRET ?? ""
      );
      if (product) productImageUrls = product.images.map((img) => img.src);
    }
    if (productImageUrls.length === 0) {
      const scraped = await scrapeProductImage(content.sourceUrl);
      if (scraped) productImageUrls = [scraped];
    }
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  try {
    // Generate all images in parallel, cycling through product gallery images
    const results = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const refUrl = productImageUrls.length > 0
          ? productImageUrls[i % productImageUrls.length]
          : null;
        const { remoteUrl, mode } = await generateOne(prompt, refUrl);
        const asset = await downloadAndSave(remoteUrl, prompt);
        return { asset, mode };
      })
    );

    const newAssets = results.map((r) => r.asset);
    const mode = results[0]?.mode ?? "text2img";

    const existing: { path: string; url: string; name: string }[] = JSON.parse(
      content.uploadedAssets ?? "[]"
    );
    await prisma.content.update({
      where: { id },
      data: { uploadedAssets: JSON.stringify([...existing, ...newAssets]) },
    });

    return NextResponse.json({ ok: true, files: newAssets, mode, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generování AI fotky selhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
