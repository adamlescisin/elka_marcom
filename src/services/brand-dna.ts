import { ollamaGenerate } from "./ollama";
import type { BrandDNA } from "@/types/brand";

export async function extractDnaFromText(
  brandName: string,
  kind: "ecommerce" | "physical",
  scrapedText: string,
  socialPosts: string[]
): Promise<Partial<BrandDNA>> {
  const postsBlock =
    socialPosts.length > 0
      ? `\nUKÁZKY PŘÍSPĚVKŮ ZE SOCIÁLNÍCH SÍTÍ:\n${socialPosts.slice(0, 10).join("\n---\n")}`
      : "";

  const prompt = `Analyzuj níže uvedený text z webu a sociálních sítí značky "${brandName}" a extrahuj Brand DNA profil.

TEXT WEBU:
${scrapedText.slice(0, 3000)}${postsBlock}

Vrať POUZE validní JSON:
{
  "brand_name": "${brandName}",
  "kind": "${kind}",
  "audience": "popis cílové skupiny",
  "tone": ["adjektivum1", "adjektivum2", "adjektivum3"],
  "voice_rules": ["pravidlo1", "pravidlo2"],
  "banned_words": ["slovo1", "slovo2"],
  "value_props": ["hodnota1", "hodnota2"],
  "recurring_phrases": ["fráze1"],
  "colors": [],
  "fonts": [],
  "hashtag_bank": ["#hashtag1", "#hashtag2"],
  "example_posts": []
}`;

  const raw = await ollamaGenerate(prompt);
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1] ?? raw;

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    return { brand_name: brandName, kind };
  }
}

export function defaultDna(brandName: string, kind: "ecommerce" | "physical"): BrandDNA {
  return {
    brand_name: brandName,
    kind,
    audience: "",
    tone: [],
    voice_rules: [],
    banned_words: [],
    value_props: [],
    recurring_phrases: [],
    colors: [],
    fonts: [],
    hashtag_bank: [],
    example_posts: [],
  };
}
