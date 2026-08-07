import { NextResponse } from "next/server";
import { checkOllamaAvailable, listOllamaModels } from "@/services/ollama";
import * as fs from "fs/promises";
import * as path from "path";

export const dynamic = "force-dynamic";

async function checkFont(): Promise<{ ok: boolean; path: string | null }> {
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    path.join(process.cwd(), "assets", "Inter-Regular.ttf"),
    path.join(
      process.cwd(),
      "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff"
    ),
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return { ok: true, path: p };
    } catch {}
  }
  return { ok: false, path: null };
}

async function checkUploadsDir(): Promise<{ ok: boolean; writable: boolean; path: string }> {
  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
    const testFile = path.join(dir, `.write-test-${Date.now()}`);
    await fs.writeFile(testFile, "ok");
    await fs.unlink(testFile);
    return { ok: true, writable: true, path: dir };
  } catch (e) {
    return { ok: false, writable: false, path: dir };
  }
}

export async function GET() {
  const [ollamaUp, models, font, uploads] = await Promise.all([
    checkOllamaAvailable(),
    listOllamaModels(),
    checkFont(),
    checkUploadsDir(),
  ]);

  const info = {
    cwd: process.cwd(),
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL ?? "(default: http://localhost:11434)",
      OLLAMA_MODEL: process.env.OLLAMA_MODEL ?? "(default: qwen3:14b)",
      DATABASE_URL: process.env.DATABASE_URL
        ? process.env.DATABASE_URL.replace(/:\/\/.*@/, "://***@")
        : "(default: file:./prisma/dev.db)",
    },
    ollama: { available: ollamaUp, models },
    font,
    uploads,
  };

  const allOk = ollamaUp && font.ok && uploads.ok;
  return NextResponse.json(info, { status: allOk ? 200 : 503 });
}
