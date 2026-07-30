import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { publishToMeta } from "../services/meta-publisher";

const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
  maxRetriesPerRequest: null,
});

const rawDbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbFilePath = rawDbUrl.startsWith("file:") ? rawDbUrl.slice(5) : rawDbUrl;
const dbUrl = dbFilePath.startsWith("/") ? `file:${dbFilePath}` : `file:${path.resolve(process.cwd(), dbFilePath)}`;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: dbUrl }) });

const publishingWorker = new Worker(
  "publishing",
  async (job) => {
    const { contentId } = job.data;
    console.log(`[publishing-worker] Processing contentId=${contentId}`);

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { brand: true },
    });

    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    if (content.status === "posted") {
      console.log(`[publishing-worker] Already posted, skipping.`);
      return;
    }

    const result = await publishToMeta(content);

    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: "posted",
        postedAt: new Date(),
        metaResult: JSON.stringify(result),
      },
    });

    console.log(`[publishing-worker] Posted contentId=${contentId}`, result);
  },
  { connection, concurrency: 1 }
);

publishingWorker.on("completed", (job) => {
  console.log(`[publishing-worker] Job ${job.id} completed.`);
});

publishingWorker.on("failed", async (job, err) => {
  console.error(`[publishing-worker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.contentId) {
    await prisma.content
      .update({
        where: { id: job.data.contentId },
        data: { status: "failed" },
      })
      .catch(() => {});
  }
});

export default publishingWorker;
