// One-time setup: initialise database and create the operator account.
// Usage: npx tsx scripts/setup.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import * as readline from "readline/promises";

const prisma = new PrismaClient();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  console.log("=== Ateliér — Setup ===\n");

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("Uživatel již existuje. Setup byl již proveden.");
    process.exit(0);
  }

  const email = await rl.question("E-mail operátora: ");
  const password = await rl.question("Heslo (min 12 znaků): ");

  if (password.length < 12) {
    console.error("Heslo je příliš krátké.");
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, passwordHash } });
  console.log(`\n✓ Uživatel vytvořen: ${user.email}`);

  // Seed brands
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
          audience: "rodiče, děti, hračky, dárky",
          tone: ["hravý", "přátelský", "vřelý"],
          voice_rules: ["tykání", "pozitivní tón", "emoji střídmě"],
          banned_words: [],
          value_props: ["kvalita", "originální dárky", "rychlé doručení"],
          recurring_phrases: [],
          colors: [],
          fonts: [],
          hashtag_bank: ["#mimimami", "#dětskémóda", "#hračky", "#dárky"],
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
          banned_words: ["nejlevnější"],
          value_props: ["kamenný obchod", "osobní přístup", "kurátorský výběr"],
          recurring_phrases: [],
          colors: [],
          fonts: [],
          hashtag_bank: ["#elkafashion", "#módačr", "#fashionczech", "#česká móda"],
          example_posts: [],
        }),
        goldExamples: "[]",
      },
    ],
  });

  console.log("✓ Značky mimimami a ELKA Fashion vytvořeny.");
  console.log("\nSetup dokončen. Spusťte aplikaci: npm run dev");
  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
