import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { brandId, accessToken } = await request.json();
  if (!brandId || !accessToken) {
    return NextResponse.json({ error: "Chybí parametry." }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return NextResponse.json({ error: "Značka nenalezena." }, { status: 404 });

  const encrypted = encrypt(accessToken);
  // Long-lived tokens expire in ~60 days; set to 55 days to trigger refresh
  const expiresAt = new Date(Date.now() + 55 * 24 * 60 * 60 * 1000);

  await prisma.metaToken.upsert({
    where: { brandId },
    create: { brandId, accessToken: encrypted, expiresAt },
    update: { accessToken: encrypted, expiresAt },
  });

  return NextResponse.json({ ok: true });
}
