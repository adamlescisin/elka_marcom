import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import argon2 from "argon2";
import path from "path";

const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
const url = filePath.startsWith("/") ? `file:${filePath}` : `file:${path.resolve(process.cwd(), filePath)}`;
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const [, , email, password] = process.argv;

async function main() {
  if (!email || !password) {
    console.error("Použití: npx tsx scripts/add-user.ts <email> <heslo>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Heslo musí mít alespoň 8 znaků.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Uživatel ${email} již existuje.`);
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email, passwordHash } });
  console.log(`✓ Uživatel vytvořen: ${user.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
