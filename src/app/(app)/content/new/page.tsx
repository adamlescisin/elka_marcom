import { prisma } from "@/lib/db";
import NewContentForm from "./NewContentForm";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const params = await searchParams;
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true, kind: true },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Nový obsah</h2>
      <NewContentForm brands={brands} defaultBrandSlug={params.brand} />
    </div>
  );
}
