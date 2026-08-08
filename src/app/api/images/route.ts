import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { fal } from "@fal-ai/client";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const images = await prisma.generatedImage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(images);
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return NextResponse.json({ error: "FAL_KEY není nastaven." }, { status: 500 });

  fal.config({ credentials: falKey });

  const body = await request.json();
  const prompt: string = (body.prompt ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "Chybí prompt." }, { status: 400 });

  const width = Math.min(Math.max(Number(body.width) || 1080, 256), 2048);
  const height = Math.min(Math.max(Number(body.height) || 1080, 256), 2048);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: { width, height },
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    const remoteUrl = (result.data as { images: { url: string }[] }).images[0]?.url;
    if (!remoteUrl) throw new Error("fal.ai nevrátilo obrázek.");

    const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) throw new Error(`Stažení selhalo: ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const ct = (imgRes.headers.get("content-type") ?? "image/png").split(";")[0].trim();
    const ext = ct === "image/jpeg" ? "jpg" : ct === "image/webp" ? "webp" : "png";
    const filename = `${uuid()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(filePath, buf);

    const image = await prisma.generatedImage.create({
      data: {
        prompt,
        mode: "text2img",
        width,
        height,
        path: filePath,
        url: `/api/uploads/${filename}`,
      },
    });

    return NextResponse.json({ ok: true, image });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generování selhalo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
