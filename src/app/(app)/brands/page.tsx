import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { contents: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Značky</h2>

      <div className="grid md:grid-cols-2 gap-5">
        {brands.map((brand) => {
          let dna: { tone?: string[]; audience?: string } = {};
          try {
            dna = JSON.parse(brand.dna);
          } catch {}

          return (
            <div
              key={brand.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-zinc-100">{brand.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {brand.kind === "ecommerce" ? "E-shop" : "Kamenný obchod"}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">{brand._count.contents} příspěvků</span>
              </div>

              {dna.audience && (
                <p className="text-sm text-zinc-400 mb-2">
                  <span className="text-zinc-500">Cílovka:</span> {dna.audience}
                </p>
              )}
              {dna.tone && dna.tone.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {dna.tone.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Link
                  href={`/content/new?brand=${brand.slug}`}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Nový obsah
                </Link>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Upravit DNA
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
