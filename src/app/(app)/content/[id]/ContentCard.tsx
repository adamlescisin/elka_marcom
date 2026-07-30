"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GeneratedCopy, CarouselSlide } from "@/types/brand";

type Brand = { id: string; name: string; slug: string };

interface UploadedAsset {
  path: string;
  url: string;
  name: string;
}

interface GeneratedAsset {
  type: string;
  path: string;
  url: string;
}

interface ContentCardProps {
  content: {
    id: string;
    brandId: string;
    format: string;
    objective: string;
    briefPrompt: string;
    sourceUrl: string | null;
    copy: GeneratedCopy | Record<string, unknown>;
    assets: GeneratedAsset[];
    status: string;
    scheduledFor: string | null;
    postedAt: string | null;
    createdAt: string;
    updatedAt: string;
    brand: Brand & { kind: string };
    revisions: unknown[];
    uploadedAssets?: UploadedAsset[];
  };
  brands: Brand[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Návrh",
  in_review: "Ke schválení",
  approved: "Schváleno",
  scheduled: "Naplánováno",
  posted: "Zveřejněno",
  failed: "Selhalo",
};

const FORMAT_LABELS: Record<string, string> = {
  single_post: "Příspěvek",
  carousel: "Karusel",
  reel: "Reel",
  ad: "Reklama",
  email: "E-mail",
};

export default function ContentCard({ content }: ContentCardProps) {
  const router = useRouter();
  const copy = content.copy as GeneratedCopy;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState(copy.caption ?? "");
  const [cta, setCta] = useState(copy.cta ?? "");
  const [hashtags, setHashtags] = useState((copy.hashtags ?? []).join(" "));
  const [slides, setSlides] = useState<CarouselSlide[]>(copy.carousel_slides ?? []);
  const [saving, setSaving] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(content.status);
  const [scheduledFor, setScheduledFor] = useState(content.scheduledFor ?? "");
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>(content.assets ?? []);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>(
    content.uploadedAssets ?? []
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const [showRevisions, setShowRevisions] = useState(false);

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3500);
  }

  async function saveEdits() {
    setSaving(true);
    const updatedCopy: GeneratedCopy = {
      ...copy,
      caption,
      cta,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
      carousel_slides: slides.length > 0 ? slides : undefined,
    };
    const res = await fetch(`/api/content/${content.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copy: updatedCopy }),
    });
    flash(res.ok ? "Uloženo." : "Chyba při ukládání.");
    setSaving(false);
  }

  async function reroll() {
    setRerolling(true);
    const res = await fetch(`/api/content/${content.id}/reroll`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      flash("Re-roll selhal. Zkontrolujte zda běží Ollama.");
    }
    setRerolling(false);
  }

  async function renderImage() {
    setRendering(true);
    const res = await fetch(`/api/content/${content.id}/render-image`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setGeneratedAssets(data.assets ?? []);
      setActiveSlide(0);
      flash("Obrázek vygenerován!");
    } else {
      const data = await res.json();
      flash(data.error ?? "Chyba generování obrázku.");
    }
    setRendering(false);
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true);
    const formData = new FormData();
    formData.append("contentId", content.id);
    for (const file of Array.from(files)) formData.append("files", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setUploadedAssets((prev) => [...prev, ...(data.files ?? [])]);
      flash(`Nahráno ${data.files?.length ?? 0} fotek.`);
    } else {
      flash("Chyba nahrávání.");
    }
    setUploading(false);
  }

  async function removeUploadedAsset(url: string) {
    const updated = uploadedAssets.filter((a) => a.url !== url);
    setUploadedAssets(updated);
    await fetch(`/api/content/${content.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadedAssets: updated }),
    });
  }

  async function updateStatus(newStatus: string) {
    const res = await fetch(`/api/content/${content.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setStatus(newStatus);
      flash(STATUS_LABELS[newStatus] ?? newStatus);
    }
  }

  async function schedulePost() {
    if (!scheduledFor) return;
    setScheduling(true);
    const res = await fetch(`/api/content/${content.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor }),
    });
    if (res.ok) {
      setStatus("scheduled");
      flash("Naplánováno!");
    } else {
      flash("Chyba plánování.");
    }
    setScheduling(false);
  }

  async function postNow() {
    const res = await fetch(`/api/content/${content.id}/publish`, { method: "POST" });
    if (res.ok) {
      setStatus("posted");
      flash("Zveřejněno!");
    } else {
      const data = await res.json();
      flash(data.error ?? "Chyba zveřejnění.");
    }
  }

  function updateSlide(index: number, field: keyof CarouselSlide, value: string) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  const revisions = (content.revisions as { timestamp: string; field: string }[]) ?? [];
  const isCarousel = content.format === "carousel";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-300">{content.brand.name}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-sm text-zinc-500">{FORMAT_LABELS[content.format] ?? content.format}</span>
            <span className="text-zinc-600">·</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                status === "approved"
                  ? "bg-green-900 text-green-300"
                  : status === "posted"
                    ? "bg-indigo-900 text-indigo-300"
                    : status === "scheduled"
                      ? "bg-blue-900 text-blue-300"
                      : status === "failed"
                        ? "bg-red-900 text-red-300"
                        : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-xs text-zinc-500">Brief: {content.briefPrompt}</p>
        </div>
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-zinc-300 text-sm">
          ← Zpět
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* LEFT — copy editor */}
        <div className="space-y-4">
          {/* Caption */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">Text příspěvku</label>
              <button
                onClick={reroll}
                disabled={rerolling}
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1"
              >
                {rerolling ? (
                  <>
                    <span className="animate-spin inline-block">↻</span> Generuji…
                  </>
                ) : (
                  "↻ Nová verze"
                )}
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Hooks */}
          {copy.hooks && copy.hooks.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">
                Alternativní zahájení — kliknutím použít
              </label>
              <div className="space-y-1.5">
                {copy.hooks.map((hook, i) => (
                  <div
                    key={i}
                    className="text-sm text-zinc-400 bg-zinc-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                    onClick={() => setCaption(hook + "\n\n" + caption.replace(/^.*?\n\n?/, ""))}
                  >
                    {hook}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA & Hashtags */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">Výzva k akci</label>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-2">Hashtagy</label>
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Carousel slides */}
          {isCarousel && slides.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-3">
                Snímky karuselu ({slides.length})
              </label>
              <div className="space-y-3">
                {slides.map((slide, i) => (
                  <div key={i} className="bg-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="text-xs text-zinc-500 font-medium">Snímek {i + 1}</div>
                    <input
                      value={slide.headline}
                      onChange={(e) => updateSlide(i, "headline", e.target.value)}
                      placeholder="Nadpis"
                      className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <textarea
                      value={slide.body}
                      onChange={(e) => updateSlide(i, "body", e.target.value)}
                      rows={2}
                      placeholder="Text snímku"
                      className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image brief */}
          {copy.image_brief && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5">Návrh vizuálu</label>
              <p className="text-sm text-zinc-400 italic">{copy.image_brief}</p>
            </div>
          )}
        </div>

        {/* RIGHT — visual panel */}
        <div className="space-y-4">
          {/* Generated image preview */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">Vizuál</label>
              <button
                onClick={renderImage}
                disabled={rendering}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                {rendering ? (
                  <>
                    <span className="animate-spin inline-block">◌</span> Generuji…
                  </>
                ) : generatedAssets.length > 0 ? (
                  "↻ Znovu vygenerovat"
                ) : (
                  "Vygenerovat obrázek"
                )}
              </button>
            </div>

            {generatedAssets.length > 0 ? (
              <div>
                {/* Carousel nav */}
                {generatedAssets.length > 1 && (
                  <div className="flex gap-1.5 mb-3 flex-wrap">
                    {generatedAssets.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                          activeSlide === i
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-800">
                  <Image
                    src={generatedAssets[activeSlide]?.url ?? generatedAssets[0].url}
                    alt="Vygenerovaný vizuál"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <a
                  href={generatedAssets[activeSlide]?.url ?? generatedAssets[0].url}
                  download
                  className="mt-2 block text-center text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                >
                  ↓ Stáhnout PNG
                </a>
              </div>
            ) : (
              <div className="aspect-square w-full bg-zinc-800 rounded-lg flex items-center justify-center">
                <p className="text-zinc-600 text-sm text-center px-4">
                  Klikněte na &quot;Vygenerovat obrázek&quot; pro vytvoření vizuálu
                  {uploadedAssets.length === 0 && (
                    <span className="block mt-1 text-xs text-zinc-700">
                      Nahrajte fotku níže pro lepší výsledek
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Photo upload */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-300">Fotografie</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? "Nahrávám…" : "+ Nahrát fotky"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
            />

            {uploadedAssets.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {uploadedAssets.map((asset) => (
                  <div key={asset.url} className="relative group aspect-square">
                    <Image
                      src={asset.url}
                      alt={asset.name}
                      fill
                      className="object-cover rounded-lg"
                      unoptimized
                    />
                    <button
                      onClick={() => removeUploadedAsset(asset.url)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                Žádné fotky. Pro ELKA nebo produktové příspěvky nahrajte fotku pro vizuál.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Message toast */}
      {message && (
        <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2.5 text-sm">
          {message}
        </div>
      )}

      {/* Actions bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={saveEdits}
            disabled={saving}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? "Ukládám…" : "Uložit změny"}
          </button>

          {status === "draft" && (
            <button
              onClick={() => updateStatus("approved")}
              className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              ✓ Schválit
            </button>
          )}

          {status === "approved" && (
            <>
              <button
                onClick={postNow}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Zveřejnit teď
              </button>
              <div className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={schedulePost}
                  disabled={scheduling || !scheduledFor}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {scheduling ? "Plánuji…" : "Naplánovat"}
                </button>
              </div>
            </>
          )}

          {status !== "draft" && (
            <button
              onClick={() => updateStatus("draft")}
              className="text-xs text-zinc-500 hover:text-zinc-300 ml-auto transition-colors"
            >
              Vrátit do návrhu
            </button>
          )}
        </div>

        <div className="flex gap-4 flex-wrap items-center border-t border-zinc-800 pt-3">
          <a
            href={`/content/new?seed=${content.id}`}
            className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
          >
            ⤷ Použít jako základ pro nový obsah
          </a>
          {revisions.length > 0 && (
            <button
              onClick={() => setShowRevisions(!showRevisions)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showRevisions ? "Skrýt historii" : `Historie (${revisions.length} změn)`}
            </button>
          )}
        </div>

        {/* Revision history */}
        {showRevisions && revisions.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Historie změn</p>
            {[...revisions].reverse().map((rev, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-zinc-500">
                <span className="flex-shrink-0 text-zinc-700">
                  {new Date((rev as { timestamp: string }).timestamp).toLocaleString("cs-CZ", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-zinc-400">
                  {(rev as { field: string }).field === "initial_generation"
                    ? "Prvotní generování"
                    : (rev as { field: string }).field === "reroll"
                      ? "Re-roll textu"
                      : `Úprava: ${(rev as { field: string }).field}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
