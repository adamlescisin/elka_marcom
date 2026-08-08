import satori from "satori";
import type { ReactNode } from "react";
import { Resvg } from "@resvg/resvg-js";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuid } from "uuid";
import type { GeneratedCopy, CarouselSlide } from "@/types/brand";

export interface ProductBadge {
  name: string;
  price: string;
  originalPrice?: string; // set when on sale
}

export interface RenderInput {
  format: "single_post" | "carousel" | string;
  copy: GeneratedCopy;
  brandName: string;
  brandColors: { primary: string; accent: string };
  photoPath?: string;    // absolute path to uploaded photo (takes priority)
  photoUrl?: string;     // external image URL fallback (e.g. WooCommerce gallery)
  photoPaths?: string[]; // per-slide paths for carousel (index matches slide index)
  productBadge?: ProductBadge;
  slideIndex?: number;
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
    // macOS system fonts (multiple common paths across versions)
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Arial.ttf",
    // Linux
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
    // Project-local asset
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

function detectMime(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "image/webp";
  return "image/jpeg";
}

async function loadPhotoBase64(photoPath?: string, photoUrl?: string): Promise<string | null> {
  // Uploaded file takes priority
  if (photoPath) {
    try {
      const buf = await fs.readFile(photoPath);
      const mime = detectMime(buf);
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {}
  }
  // Fall back to fetching an external URL (e.g. WooCommerce product image)
  if (photoUrl) {
    try {
      const res = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = detectMime(buf);
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {}
  }
  return null;
}

// Arial/Liberation have no emoji glyphs — strip them so Satori doesn't render boxes
function stripEmoji(text: string): string {
  return text
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text: string, maxLen: number): string {
  const clean = stripEmoji(text);
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1) + "…";
}

// ── Single-post template (1080×1080) ──────────────────────────────────────────
async function renderSinglePost(input: RenderInput, font: ArrayBuffer): Promise<Buffer> {
  const { copy, brandColors, photoPath, photoUrl, productBadge } = input;
  const brandName = stripEmoji(input.brandName);
  const photoB64 = await loadPhotoBase64(photoPath, photoUrl);
  const caption = wrapText(copy.caption ?? "", 200);
  const cta = stripEmoji(copy.cta ?? "");

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
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1080,
                    height: 1080,
                    backgroundImage: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.accent} 100%)`,
                  },
                },
              },
          // Bottom gradient overlay
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 480,
                backgroundImage: "linear-gradient(transparent, rgba(0,0,0,0.82))",
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
          // Product price badge (top-right, only when product data present)
          productBadge
            ? {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    position: "absolute",
                    top: 56,
                    right: 72,
                  },
                  children: [
                    productBadge.originalPrice
                      ? {
                          type: "span",
                          props: {
                            style: {
                              fontSize: 20,
                              color: "rgba(255,255,255,0.6)",
                              textDecoration: "line-through",
                              marginBottom: 4,
                            },
                            children: productBadge.originalPrice,
                          },
                        }
                      : null,
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          backgroundColor: brandColors.accent,
                          borderRadius: 32,
                          paddingLeft: 20,
                          paddingRight: 20,
                          paddingTop: 10,
                          paddingBottom: 10,
                        },
                        children: {
                          type: "span",
                          props: {
                            style: { fontSize: 26, color: "#ffffff", fontWeight: 700 },
                            children: productBadge.price,
                          },
                        },
                      },
                    },
                  ].filter(Boolean),
                },
              }
            : null,
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
          // Photo background (all slides when photo available)
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
                    // Cover slides: full bleed; content slides: top half
                    height: isFirst ? 1080 : 520,
                    objectFit: "cover",
                    opacity: isFirst ? 0.45 : 1,
                  },
                },
              }
            : null,
          // Gradient overlay — full-slide dark fade for cover, bottom-up fade for content slides with photo
          isFirst
            ? {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 500,
                    backgroundImage: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                  },
                },
              }
            : !isFirst && photoB64
            ? {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    position: "absolute",
                    top: 380,
                    left: 0,
                    right: 0,
                    height: 140,
                    backgroundImage: "linear-gradient(transparent, #ffffff)",
                  },
                },
              }
            : null,
          // Accent bar on non-cover slides without photo
          !isFirst && !photoB64
            ? {
                type: "div",
                props: {
                  style: {
                    display: "flex",
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
          // Content — on photo content slides sits in the bottom half
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: isFirst ? 80 : 0,
                ...(!isFirst && photoB64 ? { top: 500 } : !isFirst ? { top: 0 } : {}),
                left: isFirst ? 72 : (!isFirst && photoB64 ? 60 : 80),
                right: isFirst ? 72 : 60,
                display: "flex",
                flexDirection: "column",
                justifyContent: isFirst ? "flex-end" : "center",
                gap: 20,
              },
              children: [
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: isFirst ? 52 : 44,
                      fontWeight: 700,
                      color: isFirst ? "#ffffff" : "#111111",
                      lineHeight: 1.2,
                      margin: 0,
                    },
                    children: stripEmoji(slide.headline),
                  },
                },
                slide.body
                  ? {
                      type: "p",
                      props: {
                        style: {
                          fontSize: 28,
                          color: isFirst ? "rgba(255,255,255,0.85)" : "#444444",
                          lineHeight: 1.5,
                          margin: 0,
                        },
                        children: wrapText(slide.body ?? "", 160),
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
                      color: isFirst || photoB64 ? "rgba(255,255,255,0.9)" : "#999999",
                    },
                    children: `${slideIndex + 1} / ${totalSlides}`,
                  },
                },
              ],
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
  const photoB64 = await loadPhotoBase64(input.photoPath, input.photoUrl);

  const paths: string[] = [];
  const urls: string[] = [];

  if (input.format === "carousel" && input.copy.carousel_slides?.length) {
    const slides = input.copy.carousel_slides;
    for (let i = 0; i < slides.length; i++) {
      // Per-slide photo: use photoPaths[i] if available, else fall back to shared photo
      const slidePhotoB64 = input.photoPaths?.[i]
        ? (await loadPhotoBase64(input.photoPaths[i])) ?? photoB64
        : photoB64;
      const png = await renderCarouselSlide(
        slides[i],
        i,
        slides.length,
        input.brandName,
        input.brandColors,
        font,
        slidePhotoB64
      );
      const filename = `${uuid()}.png`;
      const filePath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(filePath, png);
      paths.push(filePath);
      urls.push(`/api/uploads/${filename}`);
    }
  } else {
    const png = await renderSinglePost(input, font);
    const filename = `${uuid()}.png`;
    const filePath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filePath, png);
    paths.push(filePath);
    urls.push(`/api/uploads/${filename}`);
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
