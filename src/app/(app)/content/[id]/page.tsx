import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ContentCard from "./ContentCard";

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const content = await prisma.content.findUnique({
    where: { id },
    include: { brand: true },
  });

  if (!content) notFound();

  let copy = {};
  let assets: { type: string; path: string; url: string }[] = [];
  let revisions: unknown[] = [];
  let uploadedAssets: { path: string; url: string; name: string }[] = [];
  let styleOverrides: Record<string, string> = {};
  try {
    copy = JSON.parse(content.copy);
    assets = JSON.parse(content.assets);
    revisions = JSON.parse(content.revisions);
    if (content.uploadedAssets) uploadedAssets = JSON.parse(content.uploadedAssets);
    if (content.styleOverrides) styleOverrides = JSON.parse(content.styleOverrides);
  } catch {}

  const brands = await prisma.brand.findMany({ select: { id: true, name: true, slug: true } });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ContentCard
        content={{
          id: content.id,
          brandId: content.brandId,
          format: content.format,
          objective: content.objective,
          briefPrompt: content.briefPrompt,
          sourceUrl: content.sourceUrl,
          copy,
          assets,
          revisions,
          uploadedAssets,
          styleOverrides,
          status: content.status,
          scheduledFor: content.scheduledFor?.toISOString() ?? null,
          postedAt: content.postedAt?.toISOString() ?? null,
          createdAt: content.createdAt.toISOString(),
          updatedAt: content.updatedAt.toISOString(),
          brand: {
            id: content.brand.id,
            slug: content.brand.slug,
            name: content.brand.name,
            kind: content.brand.kind,
          },
        }}
        brands={brands}
      />
    </div>
  );
}
