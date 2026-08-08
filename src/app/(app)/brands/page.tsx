import { prisma } from "@/lib/db";
import BrandsClient from "./BrandsClient";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { contents: true } } },
    orderBy: { createdAt: "asc" },
  });

  return <BrandsClient initialBrands={brands} />;
}
