"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedCopy, CarouselSlide } from "@/types/brand";

type Brand = { id: string; name: string; slug: string };

interface ContentCardProps {
  content: {
    id: string;
    brandId: string;
    format: string;
    objective: string;
    briefPrompt: string;
    sourceUrl: string | null;
    copy: GeneratedCopy | Record<string, unknown>;
    assets: unknown[];
    status: string;
    scheduledFor: string | null;
    postedAt: string | null;
    createdAt: string;
    updatedAt: string;
    brand: Brand & { kind: string };
    revisions: unknown[];
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

export default function ContentCard({ content, brands: _brands }: ContentCardProps) {
  const router = useRouter();
  const copy = content.copy as GeneratedCopy;

  const [caption, setCaption] = useState(copy.caption ?? "");
  const [cta, setCta] = useState(copy.cta ?? "");
  const [hashtags, setHashtags] = useState((copy.hashtags ?? []).join(" "));
  const [slides, setSlides] = useState<CarouselSlide[]>(copy.carousel_slides ?? []);
  const [saving, setSaving] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [status, setStatus] = useState(content.status);
  const [scheduledFor, setScheduledFor] = useState(content.scheduledFor ?? "");
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");

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

    if (res.ok) {
      setMessage("Uloženo.");
    } else {
      setMessage("Chyba při ukládání.");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function reroll() {
    setRerolling(true);
    const res = await fetch(`/api/content/${content.id}/reroll`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      setMessage("Re-roll selhal.");
    }
    setRerolling(false);
  }

  async function updateStatus(newStatus: string) {
    const res = await fetch(`/api/content/${content.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setStatus(newStatus);
      setMessage(newStatus === "approved" ? "Schváleno!" : `Stav: ${STATUS_LABELS[newStatus]}`);
      setTimeout(() => setMessage(""), 3000);
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
      setMessage("Naplánováno!");
    } else {
      setMessage("Chyba plánování.");
    }
    setScheduling(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function postNow() {
    const res = await fetch(`/api/content/${content.id}/publish`, { method: "POST" });
    if (res.ok) {
      setStatus("posted");
      setMessage("Zveřejněno!");
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Chyba zveřejnění.");
    }
    setTimeout(() => setMessage(""), 5000);
  }

  function updateSlide(index: number, field: keyof CarouselSlide, value: string) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-300">{content.brand.name}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-sm text-zinc-500">{FORMAT_LABELS[content.format]}</span>
            <span className="text-zinc-600">·</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                status === "approved"
                  ? "bg-green-900 text-green-300"
                  : status === "posted"
                    ? "bg-indigo-900 text-indigo-300"
                    : status === "scheduled"
                      ? "bg-blue-900 text-blue-300"
                      : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="text-xs text-zinc-500">Brief: {content.briefPrompt}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
        >
          ← Zpět
        </button>
      </div>

      {/* Caption */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-zinc-300">Text příspěvku</label>
          <button
            onClick={reroll}
            disabled={rerolling}
            className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            {rerolling ? "Generuji…" : "↻ Nová verze"}
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <label className="text-sm font-medium text-zinc-300 block mb-3">
            Alternativní zahájení
          </label>
          <div className="space-y-2">
            {copy.hooks.map((hook, i) => (
              <div
                key={i}
                className="text-sm text-zinc-400 bg-zinc-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                onClick={() => setCaption(hook + "\n\n" + caption.replace(/^[^\n]*\n?\n?/, ""))}
                title="Kliknutím použít jako začátek"
              >
                {hook}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA & Hashtags */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <label className="text-sm font-medium text-zinc-300 block mb-2">Výzva k akci</label>
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <label className="text-sm font-medium text-zinc-300 block mb-2">Hashtagy</label>
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Carousel slides */}
      {slides.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <label className="text-sm font-medium text-zinc-300 block mb-3">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <label className="text-sm font-medium text-zinc-300 block mb-2">
            Návrh vizuálu
          </label>
          <p className="text-sm text-zinc-400 italic">{copy.image_brief}</p>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2.5 text-sm">
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex gap-3 flex-wrap">
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
        </div>

        <div className="flex gap-3 flex-wrap">
          <a
            href={`/content/new?seed=${content.id}`}
            className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
          >
            ⤷ Použít jako základ pro nový obsah
          </a>
          {status !== "draft" && (
            <button
              onClick={() => updateStatus("draft")}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Vrátit do návrhu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
