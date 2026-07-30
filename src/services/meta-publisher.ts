import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import type { Content, Brand } from "@prisma/client";
import type { GeneratedCopy } from "@/types/brand";

const GRAPH_API = "https://graph.facebook.com/v21.0";

interface MetaPublishResult {
  igPostId?: string;
  fbPostId?: string;
  igPermalink?: string;
}

export async function publishToMeta(
  content: Content & { brand: Brand }
): Promise<MetaPublishResult> {
  const tokenRow = await prisma.metaToken.findUnique({
    where: { brandId: content.brandId },
  });

  if (!tokenRow) {
    throw new Error(
      `Žádný Meta token pro značku ${content.brand.name}. Nastavte token v sekci Nastavení.`
    );
  }

  const accessToken = decrypt(tokenRow.accessToken);
  const copy = JSON.parse(content.copy) as GeneratedCopy;
  const assets = JSON.parse(content.assets) as { type: string; path: string }[];

  const caption = [copy.caption, copy.cta, copy.hashtags.join(" ")].filter(Boolean).join("\n\n");

  const result: MetaPublishResult = {};

  // Publish to Instagram
  if (content.brand.igUserId) {
    const igResult = await publishToInstagram(
      content.brand.igUserId,
      accessToken,
      content.format,
      caption,
      assets
    );
    result.igPostId = igResult.postId;
    result.igPermalink = igResult.permalink;
  }

  // Publish to Facebook Page
  if (content.brand.metaPageId) {
    const fbResult = await publishToFacebook(
      content.brand.metaPageId,
      accessToken,
      caption,
      assets
    );
    result.fbPostId = fbResult.postId;
  }

  return result;
}

async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  format: string,
  caption: string,
  assets: { type: string; path: string }[]
): Promise<{ postId: string; permalink?: string }> {
  const imageUrl = getPublicMediaUrl(assets[0]?.path);

  let mediaContainerId: string;

  if (format === "carousel" && assets.length > 1) {
    // Create carousel children
    const childIds: string[] = [];
    for (const asset of assets) {
      const childUrl = getPublicMediaUrl(asset.path);
      const childRes = await graphPost(`/${igUserId}/media`, accessToken, {
        image_url: childUrl,
        is_carousel_item: true,
      });
      childIds.push(childRes.id);
    }

    // Create carousel container
    const containerRes = await graphPost(`/${igUserId}/media`, accessToken, {
      media_type: "CAROUSEL",
      caption,
      children: childIds.join(","),
    });
    mediaContainerId = containerRes.id;
  } else if (format === "reel" && assets[0]?.type === "video") {
    const res = await graphPost(`/${igUserId}/media`, accessToken, {
      media_type: "REELS",
      video_url: imageUrl,
      caption,
    });
    mediaContainerId = res.id;
  } else {
    const res = await graphPost(`/${igUserId}/media`, accessToken, {
      image_url: imageUrl,
      caption,
    });
    mediaContainerId = res.id;
  }

  // Publish the container
  const publishRes = await graphPost(`/${igUserId}/media_publish`, accessToken, {
    creation_id: mediaContainerId,
  });

  return { postId: publishRes.id };
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  caption: string,
  assets: { type: string; path: string }[]
): Promise<{ postId: string }> {
  const imageUrl = assets[0] ? getPublicMediaUrl(assets[0].path) : null;

  const endpoint = imageUrl ? `/${pageId}/photos` : `/${pageId}/feed`;
  const body: Record<string, string> = { message: caption };
  if (imageUrl) body.url = imageUrl;

  const res = await graphPost(endpoint, accessToken, body);
  return { postId: res.id };
}

async function graphPost(
  path: string,
  accessToken: string,
  body: Record<string, string | boolean>
): Promise<Record<string, string>> {
  const url = `${GRAPH_API}${path}`;
  const params = new URLSearchParams({
    access_token: accessToken,
    ...Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(url, {
    method: "POST",
    body: params,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Graph API error: ${res.status}`);
  }
  return data;
}

function getPublicMediaUrl(filePath?: string): string {
  if (!filePath) throw new Error("Žádné médium k zveřejnění.");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const filename = filePath.split("/").pop();
  return `${appUrl}/uploads/${filename}`;
}
