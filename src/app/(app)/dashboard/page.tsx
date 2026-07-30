import { prisma } from "@/lib/db";
import { checkOllamaAvailable, listOllamaModels } from "@/services/ollama";
import Link from "next/link";

async function getStats() {
  const [totalContent, drafts, scheduled, posted, brands, ollamaUp, models] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { status: "draft" } }),
    prisma.content.count({ where: { status: "scheduled" } }),
    prisma.content.count({ where: { status: "posted" } }),
    prisma.brand.findMany({ select: { id: true, slug: true, name: true, kind: true } }),
    checkOllamaAvailable(),
    listOllamaModels(),
  ]);

  const recentContent = await prisma.content.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { brand: { select: { name: true, slug: true } } },
  });

  return { totalContent, drafts, scheduled, posted, brands, ollamaUp, models, recentContent };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Návrh",
  in_review: "Ke schválení",
  approved: "Schváleno",
  scheduled: "Naplánováno",
  posted: "Zveřejněno",
  failed: "Selhalo",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-zinc-400",
  in_review: "text-yellow-400",
  approved: "text-green-400",
  scheduled: "text-blue-400",
  posted: "text-indigo-400",
  failed: "text-red-400",
};

export default async function DashboardPage() {
  const { totalContent, drafts, scheduled, posted, brands, ollamaUp, models, recentContent } =
    await getStats();

  const activeModel = models.find(
    (m) => m.includes("qwen3:14b") || m.includes("qwen3") || m.includes("gemma3")
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">Přehled</h2>
        <p className="text-zinc-400 text-sm mt-1">Vítejte v Ateliéru</p>
      </div>

      {/* System status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${ollamaUp ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm text-zinc-300">
            Ollama: {ollamaUp ? "aktivní" : "nedostupný"}
          </span>
        </div>
        {ollamaUp && models.length > 0 && (
          <span className="text-sm text-zinc-500">
            Model: {activeModel ?? models[0]}
          </span>
        )}
        {!ollamaUp && (
          <span className="text-sm text-yellow-500">
            Spusťte Ollama a stáhněte model: <code>ollama pull qwen3:14b</code>
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Celkem obsahu", value: totalContent },
          { label: "Návrhy", value: drafts },
          { label: "Naplánováno", value: scheduled },
          { label: "Zveřejněno", value: posted },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className="text-3xl font-bold text-zinc-100">{stat.value}</div>
            <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brands */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-100">Značky</h3>
            <Link
              href="/brands"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Spravovat →
            </Link>
          </div>
          <div className="space-y-3">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
              >
                <div>
                  <div className="font-medium text-zinc-200 text-sm">{brand.name}</div>
                  <div className="text-xs text-zinc-500">
                    {brand.kind === "ecommerce" ? "E-shop" : "Kamenný obchod"}
                  </div>
                </div>
                <Link
                  href={`/content/new?brand=${brand.slug}`}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Nový obsah
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-100">Poslední obsah</h3>
            <Link
              href="/content"
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Vše →
            </Link>
          </div>
          {recentContent.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              Zatím žádný obsah.{" "}
              <Link href="/content/new" className="text-indigo-400 hover:underline">
                Vytvořte první příspěvek
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2">
              {recentContent.map((c) => {
                let copy: { caption?: string } = {};
                try {
                  copy = JSON.parse(c.copy);
                } catch {}
                return (
                  <Link
                    key={c.id}
                    href={`/content/${c.id}`}
                    className="block py-2 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{c.brand.name}</span>
                      <span className={`text-xs ${STATUS_COLORS[c.status] ?? "text-zinc-400"}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 mt-0.5 line-clamp-1">
                      {copy.caption || c.briefPrompt}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
