import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";

// One-time setup: create the operator account and seed brand records.
// Disable or remove after first use.
export async function POST(request: NextRequest) {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json({ error: "Setup already completed." }, { status: 409 });
  }

  const { email, password } = await request.json();
  if (!email || !password || password.length < 12) {
    return NextResponse.json(
      { error: "Email and password (min 12 chars) required." },
      { status: 400 }
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, passwordHash } });

  // Seed default brands
  await prisma.brand.createMany({
    data: [
      {
        slug: "mimimami",
        name: "mimimami",
        kind: "ecommerce",
        websiteUrl: "https://mimimami.cz",
        wooBaseUrl: process.env.WOO_BASE_URL ?? "",
        dna: JSON.stringify({
          brand_name: "mimimami",
          kind: "ecommerce",
          audience: "rodiče, děti, dárky, hračky",
          tone: ["hravý", "přátelský", "vřelý"],
          voice_rules: ["tykání", "pozitivní tón", "emoji střídmě"],
          banned_words: [],
          value_props: ["kvalita", "originální dárky", "rychlé doručení"],
          recurring_phrases: [],
          colors: [],
          fonts: [],
          hashtag_bank: ["#mimimami", "#dětskémóda", "#dárky"],
          example_posts: [],
        }),
        goldExamples: "[]",
      },
      {
        slug: "elka",
        name: "ELKA Fashion",
        kind: "physical",
        websiteUrl: "https://elkafashion.cz",
        dna: JSON.stringify({
          brand_name: "ELKA Fashion",
          kind: "physical",
          audience: "české ženy, módní vědomé, 25–55 let",
          tone: ["elegantní", "sebevědomý", "přístupný"],
          voice_rules: ["vykání", "krátké věty", "emoji střídmě"],
          banned_words: ["nejlevnější", "výprodej zdarma"],
          value_props: ["kamenný obchod", "osobní přístup", "kurátorský výběr"],
          recurring_phrases: [],
          colors: [],
          fonts: [],
          hashtag_bank: ["#elkafashion", "#módačr", "#fashionczech"],
          example_posts: [],
        }),
        goldExamples: "[]",
      },
    ],
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
