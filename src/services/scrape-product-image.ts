import * as cheerio from "cheerio";

export async function scrapeProductImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "cs,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    return (
      $('meta[property="og:image"]').attr("content") ??
      $('meta[property="og:image:url"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      $('meta[name="twitter:image:src"]').attr("content") ??
      $(".woocommerce-product-gallery__image a").first().attr("href") ??
      null
    );
  } catch {
    return null;
  }
}
