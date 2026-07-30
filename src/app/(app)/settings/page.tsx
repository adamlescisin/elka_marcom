import { prisma } from "@/lib/db";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const brands = await prisma.brand.findMany({
    select: { id: true, slug: true, name: true, metaPageId: true, igUserId: true, wooBaseUrl: true },
  });

  const tokenStatus: Record<string, boolean> = {};
  for (const brand of brands) {
    const token = await prisma.metaToken.findUnique({ where: { brandId: brand.id } });
    tokenStatus[brand.id] = !!token;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Nastavení</h2>
      <SettingsForm brands={brands} tokenStatus={tokenStatus} />
    </div>
  );
}
