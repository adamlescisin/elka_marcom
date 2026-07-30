export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; alt: string }[];
  attributes: { name: string; options: string[] }[];
  stock_status: string;
  on_sale: boolean;
}

export async function fetchWooProduct(
  productUrl: string,
  wooBaseUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<WooProduct | null> {
  // Extract product slug from URL
  const slug = extractSlugFromUrl(productUrl);
  if (!slug) return null;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const apiUrl = `${wooBaseUrl}/wp-json/wc/v3/products?slug=${encodeURIComponent(slug)}&per_page=1`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return null;

  const products: WooProduct[] = await response.json();
  return products[0] ?? null;
}

export async function fetchWooProducts(
  wooBaseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  page = 1,
  perPage = 100
): Promise<WooProduct[]> {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const apiUrl = `${wooBaseUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish`;

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) return [];
  return response.json();
}

function extractSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    // WooCommerce product URLs typically end with the slug
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

export function formatProductForBrief(product: WooProduct): string {
  const price = product.sale_price
    ? `${product.sale_price} Kč (bylo ${product.regular_price} Kč)`
    : `${product.price} Kč`;

  const categories = product.categories.map((c) => c.name).join(", ");
  const images = product.images.map((i) => i.src).join(", ");

  return [
    `Název: ${product.name}`,
    `Kategorie: ${categories}`,
    `Cena: ${price}`,
    product.on_sale ? "Na slevě: ANO" : "",
    `Popis: ${stripHtml(product.short_description || product.description)}`,
    `Obrázky: ${images}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
