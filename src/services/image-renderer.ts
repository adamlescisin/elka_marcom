import satori from "satori";
import type { ReactNode } from "react";
import { Resvg } from "@resvg/resvg-js";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";
import type { GeneratedCopy, CarouselSlide } from "@/types/brand";

export interface RenderInput {
  format: "single_post" | "carousel" | string;
  copy: GeneratedCopy;
  brandName: string;
  brandColors: { primary: string; accent: string };
  photoPath?: string; // absolute path to uploaded photo
  slideIndex?: number; // for carousel — which slide to render
}

export interface RenderResult {
  paths: string[]; // absolute paths to generated PNGs
  urls: string[];  // public URLs (/uploads/...)
}

const OUTPUT_DIR = path.join(process.cwd(), "public", "uploads");

// Embedded Inter font subset (Latin) — loaded once
let fontData: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  // Use system font fallback path — on Mac/Linux
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    path.join(process.cwd(), "assets", "Inter-Regular.ttf"),
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      fontData = buf.buffer as ArrayBuffer;
      return fontData;
    } catch {}
  }
  // Fallback: download Inter from npm if nothing found
  const interPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "inter",
    "files",
    "inter-latin-400-normal.woff"
  );
  try {
    const buf = await fs.readFile(interPath);
    fontData = buf.buffer as ArrayBuffer;
    return fontData;
  } catch {}
  throw new Error("Nenalezen žádný font pro generování obrázků. Uložte Inter-Regular.ttf do assets/");
}

async function loadPhotoBase64(photoPath?: string): Promise<string | null> {
  if (!photoPath) return null;
  try {
    const buf = await fs.readFile(photoPath);
    const ext = path.extname(photoPath).toLowerCase().slice(1);
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function wrapText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

// ── Single-post template (1080×1080) ──────────────────────────────────────────
async function renderSinglePost(input: RenderInput, font: ArrayBuffer): Promise<Buffer> {
  const { copy, brandName, brandColors, photoPath } = input;
  const photoB64 = await loadPhotoBase64(photoPath);
  const caption = wrapText(copy.caption ?? "", 200);
  const cta = copy.cta ?? "";

  const svg = await satori(
    ({
      type: "div",
      props: {
        style: {
          width: 1080,
          height: 1080,
          backgroundColor: brandColors.primary,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // Photo background or color block
          photoB64
            ? {
                type: "img",
                props: {
                  src: photoB64,
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1080,
                    height: 1080,
                    objectFit: "cover",
                    opacity: 0.55,
                  },
                },
              }
            : {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1080,
                    height: 1080,
                    background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.accent} 100%)`,
                  },
                },
              },
          // Bottom gradient overlay
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 480,
                background: "linear-gradient(transparent, rgba(0,0,0,0.82))",
              },
            },
          },
          // Text block
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 72,
                left: 72,
                right: 72,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              },
              children: [
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: 42,
                      fontWeight: 700,
                      color: "#ffffff",
                      lineHeight: 1.25,
                      margin: 0,
                    },
                    children: caption,
                  },
                },
                cta
                  ? {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 28,
                          color: brandColors.accent,
                          fontWeight: 600,
                          margin: 0,
                        },
                        children: cta,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Brand name chip
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 56,
                left: 72,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 32,
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: 10,
                paddingBottom: 10,
              },
              children: {
                type: "span",
                props: {
                  style: { fontSize: 24, color: "#ffffff", fontWeight: 600 },
                  children: brandName,
                },
              },
            },
          },
        ],
      },
    }) as ReactNode,
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
    }
  );

  return Buffer.from(new Resvg(svg).render().asPng());
}

// ── Carousel slide template (1080×1080) ───────────────────────────────────────
async function renderCarouselSlide(
  slide: CarouselSlide,
  slideIndex: number,
  totalSlides: number,
  brandName: string,
  brandColors: { primary: string; accent: string },
  font: ArrayBuffer,
  photoB64: string | null
): Promise<Buffer> {
  const isFirst = slideIndex === 0;

  const svg = await satori(
    ({
      type: "div",
      props: {
        style: {
          width: 1080,
          height: 1080,
          backgroundColor: isFirst ? brandColors.primary : "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // Cover slide: photo + title
          isFirst && photoB64
            ? {
                type: "img",
                props: {
                  src: photoB64,
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1080,
                    height: 1080,
                    objectFit: "cover",
                    opacity: 0.45,
                  },
                },
              }
            : null,
          // Dark overlay for text readability on first slide
          isFirst
            ? {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 500,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                  },
                },
              }
            : null,
          // Accent bar on non-cover slides
          !isFirst
            ? {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 12,
                    height: 1080,
                    backgroundColor: brandColors.accent,
                  },
                },
              }
            : null,
          // Content
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: isFirst ? 80 : 0,
                top: isFirst ? "auto" : 0,
                left: isFirst ? 72 : 80,
                right: 72,
                display: "flex",
                flexDirection: "column",
                justifyContent: isFirst ? "flex-end" : "center",
                gap: 24,
              },
              children: [
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: isFirst ? 52 : 48,
                      fontWeight: 700,
                      color: isFirst ? "#ffffff" : "#111111",
                      lineHeight: 1.2,
                      margin: 0,
                    },
                    children: slide.headline,
                  },
                },
                slide.body
                  ? {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 30,
                          color: isFirst ? "rgba(255,255,255,0.85)" : "#444444",
                          lineHeight: 1.5,
                          margin: 0,
                        },
                        children: wrapText(slide.body, 180),
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          // Slide counter
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 56,
                right: 72,
                display: "flex",
                gap: 8,
                alignItems: "center",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 22,
                      color: isFirst ? "rgba(255,255,255,0.7)" : "#999999",
                    },
                    children: `${slideIndex + 1} / ${totalSlides}`,
                  },
                },
              ],
            },
          },
          // Brand name
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 52,
                left: isFirst ? 72 : 80,
                fontSize: 22,
                color: isFirst ? "rgba(255,255,255,0.8)" : brandColors.accent,
                fontWeight: 600,
              },
              children: brandName,
            },
          },
        ].filter(Boolean),
      },
    }) as ReactNode,
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: "Inter", data: font, weight: 400, style: "normal" }],
    }
  );

  return Buffer.from(new Resvg(svg).render().asPng());
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function renderContentImage(input: RenderInput): Promise<RenderResult> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const font = await getFont();
  const photoB64 = await loadPhotoBase64(input.photoPath);

  const paths: string[] = [];
  const urls: string[] = [];

  if (input.format === "carousel" && input.copy.carousel_slides?.length) {
    const slides = input.copy.carousel_slides;
    for (let i = 0; i < slides.length; i++) {
      const png = await renderCarouselSlide(
        slides[i],
        i,
        slides.length,
        input.brandName,
        input.brandColors,
        font,
        photoB64
      );
      const filename = `${uuid()}.png`;
      const filePath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(filePath, png);
      paths.push(filePath);
      urls.push(`/uploads/${filename}`);
    }
  } else {
    const png = await renderSinglePost(input, font);
    const filename = `${uuid()}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filePath, png);
    paths.push(filePath);
    urls.push(`/uploads/${filename}`);
  }

  return { paths, urls };
}

export function defaultBrandColors(dna: { colors?: string[] }): {
  primary: string;
  accent: string;
} {
  const colors = dna.colors ?? [];
  return {
    primary: colors[0] ?? "#1a1a2e",
    accent: colors[1] ?? "#e94560",
  };
}
