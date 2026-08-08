import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const body = await request.json();
  const name: string = (body.name ?? "").trim();
  const kind: string = body.kind ?? "ecommerce";
  const websiteUrl: string = (body.websiteUrl ?? "").trim();

  if (!name) return NextResponse.json({ error: "Název je povinný." }, { status: 400 });
  if (!websiteUrl) return NextResponse.json({ error: "URL webu je povinná." }, { status: 400 });

  let slug = slugify(name);
  // Ensure uniqueness by appending a number if needed
  const existing = await prisma.brand.findMany({
    where: { slug: { startsWith: slug } },
    select: { slug: true },
  });
  if (existing.length > 0) {
    const taken = new Set(existing.map((b) => b.slug));
    if (taken.has(slug)) {
      let i = 2;
      while (taken.has(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }
  }

  const brand = await prisma.brand.create({
    data: { name, slug, kind, websiteUrl },
  });

  return NextResponse.json(brand, { status: 201 });
}
