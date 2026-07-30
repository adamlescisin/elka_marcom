import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { extractDnaFromText } from "@/services/brand-dna";
import * as cheerio from "cheerio";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) return NextResponse.json({ error: "Nenalezena." }, { status: 404 });

  try {
    // Scrape the brand website
    const websiteText = await scrapeWebsite(brand.websiteUrl);

    // Pull social history if Meta token exists
    const socialPosts = await getSocialHistory(brand.id);

    const dna = await extractDnaFromText(
      brand.name,
      brand.kind as "ecommerce" | "physical",
      websiteText,
      socialPosts
    );

    return NextResponse.json({ dna });
  } catch (err) {
    console.error("DNA extraction error:", err);
    return NextResponse.json({ error: "Extrakce selhala." }, { status: 500 });
  }
}

async function scrapeWebsite(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Atelier/1.0)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return "";

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove scripts/styles/nav/footer
  $("script, style, nav, footer, header, .cookie-notice").remove();

  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, 5000);
}

async function getSocialHistory(brandId: string): Promise<string[]> {
  try {
    const { default: db } = await import("@/lib/db");
    const { decrypt } = await import("@/lib/crypto");

    const tokenRow = await db.metaToken.findUnique({ where: { brandId } });
    if (!tokenRow) return [];

    const accessToken = decrypt(tokenRow.accessToken);
    const brand = await db.brand.findUnique({ where: { id: brandId } });
    if (!brand?.igUserId) return [];

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${brand.igUserId}/media?fields=caption&limit=20&access_token=${accessToken}`
    );

    if (!res.ok) return [];
    const data = await res.json();
    return (data.data ?? [])
      .map((p: { caption?: string }) => p.caption)
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
}
