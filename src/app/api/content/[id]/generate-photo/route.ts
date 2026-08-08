import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { fal } from "@fal-ai/client";
import { scrapeProductImage } from "@/services/scrape-product-image";
import { fetchWooProduct } from "@/services/woocommerce";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

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

  // Resolve product image URL from sourceUrl (WooCommerce API or og:image scrape)
  let productImageUrl: string | null = null;
  if (content.sourceUrl) {
    if (content.brand.wooBaseUrl) {
      const product = await fetchWooProduct(
        content.sourceUrl,
        content.brand.wooBaseUrl,
        process.env.WOO_CONSUMER_KEY ?? "",
        process.env.WOO_CONSUMER_SECRET ?? ""
      );
      productImageUrl = product?.images[0]?.src ?? null;
    }
    if (!productImageUrl) {
      productImageUrl = await scrapeProductImage(content.sourceUrl);
    }
  }

  try {
    let remoteUrl: string;

    if (productImageUrl) {
      // img2img: use the product photo as visual reference
      const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
        input: {
          prompt,
          image_url: productImageUrl,
          strength: 0.8,
          num_inference_steps: 28,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
      remoteUrl = (result.data as { images: { url: string }[] }).images[0]?.url;
    } else {
      // text-to-image: no product reference
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        },
      });
      remoteUrl = (result.data as { images: { url: string }[] }).images[0]?.url;
    }

    if (!remoteUrl) throw new Error("fal.ai nevrátilo žádný obrázek.");

    const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) throw new Error(`Stažení obrázku selhalo: ${imgRes.status}`);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ct = (imgRes.headers.get("content-type") ?? "image/png").split(";")[0].trim();
    const ext = ct === "image/jpeg" ? "jpg" : ct === "image/webp" ? "webp" : "png";
    const filename = `${uuid()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, buf);

    const asset = {
      path: filePath,
      url: `/api/uploads/${filename}`,
      name: prompt.slice(0, 80),
    };

    const existing: { path: string; url: string; name: string }[] = JSON.parse(
      content.uploadedAssets ?? "[]"
    );
    await prisma.content.update({
      where: { id },
      data: { uploadedAssets: JSON.stringify([...existing, asset]) },
    });

    return NextResponse.json({
      ok: true,
      file: asset,
      mode: productImageUrl ? "img2img" : "text2img",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generování AI fotky selhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
