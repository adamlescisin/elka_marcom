import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { decrypt } from "../lib/crypto";

const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
});

const rawDbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbFilePath = rawDbUrl.startsWith("file:") ? rawDbUrl.slice(5) : rawDbUrl;
const dbUrl = dbFilePath.startsWith("/") ? `file:${dbFilePath}` : `file:${path.resolve(process.cwd(), dbFilePath)}`;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: dbUrl }) });
const analyticsQueue = new Queue("analytics", { connection });
const GRAPH_API = "https://graph.facebook.com/v21.0";

// Schedule recurring analytics polls (BullMQ v6+ API)
async function scheduleRepeat() {
  await analyticsQueue.upsertJobScheduler(
    "analytics-hourly",
    { every: 3600000 }, // every hour
    { name: "poll", data: {} }
  );
  console.log("[analytics-worker] Scheduled hourly poll.");
}

const analyticsWorker = new Worker(
  "analytics",
  async () => {
    console.log("[analytics-worker] Polling analytics…");

    const brands = await prisma.brand.findMany();

    for (const brand of brands) {
      const tokenRow = await prisma.metaToken.findUnique({
        where: { brandId: brand.id },
      });
      if (!tokenRow || !brand.igUserId) continue;

      const accessToken = decrypt(tokenRow.accessToken);

      try {
        await pollIgInsights(brand.id, brand.igUserId, accessToken);
      } catch (err) {
        console.error(`[analytics-worker] Failed for brand ${brand.slug}:`, err);
      }
    }
  },
  { connection }
);

async function pollIgInsights(brandId: string, igUserId: string, accessToken: string) {
  // Account-level metrics
  const metricsUrl = `${GRAPH_API}/${igUserId}/insights?metric=reach,impressions,profile_views,follower_count&period=day&access_token=${accessToken}`;
  const res = await fetch(metricsUrl);
  if (!res.ok) return;

  const data = await res.json();
  const rows = data.data ?? [];

  const inserts = rows.flatMap((metric: { name: string; values: { value: number }[] }) =>
    metric.values.map((v: { value: number }) => ({
      contentId: null,
      platform: "instagram",
      metric: metric.name,
      value: v.value,
      capturedAt: new Date(),
    }))
  );

  if (inserts.length > 0) {
    await prisma.analytics.createMany({ data: inserts });
  }

  // Per-post metrics for recent posted content
  const recentPosts = await prisma.content.findMany({
    where: {
      brand: { id: brandId },
      status: "posted",
      postedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    include: { brand: true },
  });

  for (const post of recentPosts) {
    let metaResult: { igPostId?: string } = {};
    try {
      metaResult = JSON.parse(post.metaResult ?? "{}");
    } catch {}

    if (!metaResult.igPostId) continue;

    const postRes = await fetch(
      `${GRAPH_API}/${metaResult.igPostId}/insights?metric=reach,impressions,likes_count,comments_count,saved,shares&access_token=${accessToken}`
    );

    if (!postRes.ok) continue;

    const postData = await postRes.json();
    const postInserts = (postData.data ?? []).map(
      (m: { name: string; values: { value: number }[] }) => ({
        contentId: post.id,
        platform: "instagram",
        metric: m.name,
        value: m.values[0]?.value ?? 0,
        capturedAt: new Date(),
      })
    );

    if (postInserts.length > 0) {
      await prisma.analytics.createMany({ data: postInserts });
    }
  }
}

scheduleRepeat().catch(console.error);

analyticsWorker.on("completed", () => {
  console.log("[analytics-worker] Poll completed.");
});

export default analyticsWorker;
