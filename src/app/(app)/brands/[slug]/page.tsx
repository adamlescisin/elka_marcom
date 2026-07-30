import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BrandDnaEditor from "./BrandDnaEditor";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) notFound();

  let dna = {};
  let goldExamples: unknown[] = [];
  try {
    dna = JSON.parse(brand.dna);
    goldExamples = JSON.parse(brand.goldExamples);
  } catch {}

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-zinc-100 mb-1">{brand.name}</h2>
      <p className="text-zinc-500 text-sm mb-6">Brand DNA profil</p>
      <BrandDnaEditor
        brand={{ id: brand.id, slug: brand.slug, name: brand.name, kind: brand.kind }}
        initialDna={dna}
        initialGoldExamples={goldExamples as { format: string; text: string }[]}
      />
    </div>
  );
}
