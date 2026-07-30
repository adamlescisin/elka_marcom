import { prisma } from "@/lib/db";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  draft: "Návrh",
  in_review: "Ke schválení",
  approved: "Schváleno",
  scheduled: "Naplánováno",
  posted: "Zveřejněno",
  failed: "Selhalo",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  in_review: "bg-yellow-900 text-yellow-300",
  approved: "bg-green-900 text-green-300",
  scheduled: "bg-blue-900 text-blue-300",
  posted: "bg-indigo-900 text-indigo-300",
  failed: "bg-red-900 text-red-300",
};

const FORMAT_LABELS: Record<string, string> = {
  single_post: "Příspěvek",
  carousel: "Karusel",
  reel: "Reel",
  ad: "Reklama",
  email: "E-mail",
};

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; status?: string }>;
}) {
  const params = await searchParams;
  const where: Record<string, string> = {};
  if (params.brand) where.brandId = params.brand;
  if (params.status) where.status = params.status;

  const [contents, brands] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { brand: { select: { name: true, slug: true } } },
    }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">Obsah</h2>
        <Link
          href="/content/new"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nový obsah
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Link
          href="/content"
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            !params.brand && !params.status
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          }`}
        >
          Vše
        </Link>
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/content?brand=${b.id}`}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              params.brand === b.id
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            }`}
          >
            {b.name}
          </Link>
        ))}
        {["draft", "approved", "scheduled", "posted"].map((s) => (
          <Link
            key={s}
            href={`/content?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              params.status === s
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
            }`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {contents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 mb-4">Žádný obsah nenalezen.</p>
          <Link
            href="/content/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Vytvořit první příspěvek
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {contents.map((c) => {
            let copy: { caption?: string } = {};
            try {
              copy = JSON.parse(c.copy);
            } catch {}
            return (
              <Link
                key={c.id}
                href={`/content/${c.id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-zinc-400">{c.brand.name}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-xs text-zinc-500">
                        {FORMAT_LABELS[c.format] ?? c.format}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200 line-clamp-2">
                      {copy.caption || c.briefPrompt}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      {new Date(c.createdAt).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs px-2 py-1 rounded-md font-medium ${
                      STATUS_COLORS[c.status] ?? "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
