import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // libsql needs a file: URL; resolve relative paths to absolute
  let url: string;
  if (raw.startsWith("file:")) {
    const filePath = raw.slice("file:".length);
    url = filePath.startsWith("/")
      ? `file:${filePath}`
      : `file:${path.resolve(process.cwd(), filePath)}`;
  } else {
    url = `file:${path.resolve(process.cwd(), raw)}`;
  }

  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
