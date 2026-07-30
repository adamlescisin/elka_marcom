import type { BrandDNA, ContentFormat, ContentObjective, GeneratedCopy } from "@/types/brand";
import { ollamaGenerate } from "./ollama";

export interface BriefInput {
  brand: {
    dna: BrandDNA;
    goldExamples: { format: string; text: string }[];
  };
  format: ContentFormat;
  objective: ContentObjective;
  briefPrompt: string;
  productContext?: string; // from WooCommerce
  uploadedPhotoPaths?: string[];
  seedContent?: { copy: GeneratedCopy; briefPrompt: string };
  numSlides?: number;
}

const FORMAT_LABELS: Record<ContentFormat, string> = {
  single_post: "jednoduchý příspěvek",
  carousel: "karusel (více snímků)",
  reel: "video reel",
  ad: "placená reklama",
  email: "e-mail / newsletter",
};

const OBJECTIVE_LABELS: Record<ContentObjective, string> = {
  awareness: "zvyšování povědomí o značce",
  sale: "prodej / sleva",
  new_product: "nový produkt",
  seasonal: "sezónní příležitost",
  restock: "naskladnění / dostupnost",
  engagement: "zapojení komunity",
};

export async function generateContent(input: BriefInput): Promise<GeneratedCopy> {
  const systemPrompt = buildSystemPrompt(input.brand.dna, input.brand.goldExamples);
  const userPrompt = buildUserPrompt(input);

  const raw = await ollamaGenerate(userPrompt, systemPrompt);
  return parseGeneratedCopy(raw, input.format, input.numSlides);
}

function buildSystemPrompt(
  dna: BrandDNA,
  goldExamples: { format: string; text: string }[]
): string {
  const rules = dna.voice_rules.map((r) => `- ${r}`).join("\n");
  const banned = dna.banned_words.length
    ? `\nZAKÁZANÁ SLOVA (nikdy nepoužívej): ${dna.banned_words.join(", ")}`
    : "";
  const props = dna.value_props.map((v) => `- ${v}`).join("\n");
  const hashtagBank = dna.hashtag_bank.slice(0, 15).join(" ");

  const examples = goldExamples
    .slice(0, 5)
    .map((ex, i) => `[Příklad ${i + 1} - ${ex.format}]\n${ex.text}`)
    .join("\n\n");

  return `Jsi expert na marketing pro českou značku "${dna.brand_name}". Píšeš výhradně česky.

PERSONA ZNAČKY:
Tón: ${dna.tone.join(", ")}
Cílová skupina: ${dna.audience}

PRAVIDLA HLASU:
${rules}${banned}

HODNOTY ZNAČKY:
${props}

HASHTAG BANKA: ${hashtagBank}

ZLATÉ PŘÍKLADY (inspiruj se stylem a délkou):
${examples || "Žádné příklady zatím."}

INSTRUKCE PRO VÝSTUP:
Vrať POUZE validní JSON v následujícím formátu. Žádný jiný text před ani po JSON.
{
  "caption": "hlavní text příspěvku",
  "hooks": ["alternativní zahájení 1", "alternativní zahájení 2", "alternativní zahájení 3"],
  "cta": "výzva k akci",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "carousel_slides": [{"headline": "nadpis", "body": "text"}, ...],
  "image_brief": "popis vizuálu pro grafika nebo generátor obrázků"
}
Pole carousel_slides vyplň POUZE pro formát karusel.`;
}

function buildUserPrompt(input: BriefInput): string {
  const lines = [
    `FORMÁT: ${FORMAT_LABELS[input.format]}`,
    `CÍL: ${OBJECTIVE_LABELS[input.objective]}`,
    ``,
    `BRIEF OD OPERÁTORA:`,
    input.briefPrompt,
  ];

  if (input.productContext) {
    lines.push(``, `PRODUKT:`, input.productContext);
  }

  if (input.uploadedPhotoPaths?.length) {
    lines.push(
      ``,
      `FOTOGRAFIE: Operátor nahrál ${input.uploadedPhotoPaths.length} fotek. Vizuál vychází z těchto fotografií.`
    );
  }

  if (input.format === "carousel" && input.numSlides) {
    lines.push(``, `POČET SNÍMKŮ KARUSELU: ${input.numSlides}`);
  }

  if (input.seedContent) {
    lines.push(
      ``,
      `INSPIRACE Z PŘEDCHOZÍHO OBSAHU (použij jako základ, ale vytvoř nový obsah):`,
      `Brief: ${input.seedContent.briefPrompt}`,
      `Předchozí text: ${input.seedContent.copy.caption}`
    );
  }

  lines.push(``, `Vytvoř obsah nyní:`);
  return lines.join("\n");
}

function parseGeneratedCopy(
  raw: string,
  format: ContentFormat,
  numSlides?: number
): GeneratedCopy {
  // Extract JSON from response (model may wrap it in markdown code blocks)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch?.[1] ?? raw;

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      caption: parsed.caption ?? "",
      hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
      cta: parsed.cta ?? "",
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      carousel_slides:
        format === "carousel" && Array.isArray(parsed.carousel_slides)
          ? parsed.carousel_slides.slice(0, numSlides ?? parsed.carousel_slides.length)
          : undefined,
      image_brief: parsed.image_brief ?? "",
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      caption: raw.slice(0, 2000),
      hooks: [],
      cta: "",
      hashtags: [],
      image_brief: "",
    };
  }
}
