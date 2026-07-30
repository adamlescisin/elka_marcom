import { prisma } from "@/lib/db";

export default async function AnalyticsPage() {
  const [totalPosted, recentAnalytics, topContent] = await Promise.all([
    prisma.content.count({ where: { status: "posted" } }),
    prisma.analytics.findMany({
      take: 200,
      orderBy: { capturedAt: "desc" },
    }),
    prisma.content.findMany({
      where: { status: "posted" },
      take: 10,
      orderBy: { postedAt: "desc" },
      include: { brand: { select: { name: true } } },
    }),
  ]);

  // Aggregate metrics by metric name
  const metricTotals: Record<string, number> = {};
  for (const row of recentAnalytics) {
    metricTotals[row.metric] = (metricTotals[row.metric] ?? 0) + row.value;
  }

  const metricLabels: Record<string, string> = {
    reach: "Dosah",
    impressions: "Zobrazení",
    likes: "Lajky",
    comments: "Komentáře",
    saves: "Uložení",
    shares: "Sdílení",
    profile_views: "Zobrazení profilu",
    followers: "Sledující",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-zinc-100 mb-6">Analytika</h2>

      {totalPosted === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500">Zatím žádné zveřejněné příspěvky.</p>
          <p className="text-zinc-600 text-sm mt-2">
            Analytika se zobrazí po prvním zveřejnění.
          </p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          {Object.keys(metricTotals).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(metricTotals).map(([metric, value]) => (
                <div
                  key={metric}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="text-2xl font-bold text-zinc-100">
                    {value.toLocaleString("cs-CZ")}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {metricLabels[metric] ?? metric}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent posts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold text-zinc-100 mb-4">Zveřejněné příspěvky</h3>
            <div className="space-y-3">
              {topContent.map((c) => {
                let copy: { caption?: string } = {};
                try {
                  copy = JSON.parse(c.copy);
                } catch {}
                const postAnalytics = recentAnalytics.filter((a) => a.contentId === c.id);
                const reach = postAnalytics.find((a) => a.metric === "reach")?.value;
                const likes = postAnalytics.find((a) => a.metric === "likes")?.value;

                return (
                  <div
                    key={c.id}
                    className="flex items-start justify-between py-2 border-b border-zinc-800 last:border-0"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-xs text-zinc-500 mb-0.5">{c.brand.name}</div>
                      <p className="text-sm text-zinc-300 line-clamp-1">
                        {copy.caption || "(bez textu)"}
                      </p>
                      <div className="text-xs text-zinc-600 mt-0.5">
                        {c.postedAt
                          ? new Date(c.postedAt).toLocaleDateString("cs-CZ", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </div>
                    </div>
                    <div className="text-right text-xs flex-shrink-0 space-y-0.5">
                      {reach !== undefined && (
                        <div className="text-zinc-400">
                          Dosah: <span className="text-zinc-200">{reach.toLocaleString("cs-CZ")}</span>
                        </div>
                      )}
                      {likes !== undefined && (
                        <div className="text-zinc-400">
                          Lajky: <span className="text-zinc-200">{likes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-zinc-600 mt-4">
            Analytika se aktualizuje průběžně. Meta data mají zpoždění 24–48 hodin.
          </p>
        </>
      )}
    </div>
  );
}
