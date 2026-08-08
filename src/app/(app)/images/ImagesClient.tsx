"use client";

import { useState, useEffect, useCallback } from "react";

interface GeneratedImage {
  id: string;
  prompt: string;
  width: number;
  height: number;
  url: string;
  createdAt: string;
}

const SIZE_PRESETS = [
  { label: "Čtverec 1080×1080", width: 1080, height: 1080 },
  { label: "Portrét 1080×1350", width: 1080, height: 1350 },
  { label: "Story 1080×1920", width: 1080, height: 1920 },
  { label: "Krajina 1920×1080", width: 1920, height: 1080 },
  { label: "Vlastní rozměry", width: 0, height: 0 },
];

export default function ImagesClient() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [presetIndex, setPresetIndex] = useState(0);
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isCustom = presetIndex === SIZE_PRESETS.length - 1;
  const width = isCustom ? customWidth : SIZE_PRESETS[presetIndex].width;
  const height = isCustom ? customHeight : SIZE_PRESETS[presetIndex].height;

  const loadImages = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/images");
    if (res.ok) setImages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadImages(); }, [loadImages]);

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    const res = await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width, height }),
    });
    if (res.ok) {
      const data = await res.json();
      setImages((prev) => [data.image, ...prev]);
      setPrompt("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Generování selhalo.");
    }
    setGenerating(false);
  }

  async function deleteImage(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((img) => img.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Generator panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">Nový obrázek</h2>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Popis obrázku v angličtině — čím konkrétnější, tím lepší výsledek…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />

        {/* Size preset selector */}
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPresetIndex(i)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                presetIndex === i
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isCustom && (
          <div className="flex gap-3 items-center">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Šířka (px)</label>
              <input
                type="number"
                min={256}
                max={2048}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-zinc-500 mt-4">×</span>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Výška (px)</label>
              <input
                type="number"
                min={256}
                max={2048}
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-xs text-zinc-500 mt-4">
              {width}×{height}
            </span>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          onClick={generate}
          disabled={generating || !prompt.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block">↻</span> Generuji… (10–30s)
            </span>
          ) : (
            "Vygenerovat"
          )}
        </button>
      </div>

      {/* Image library */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-400">
            Knihovna{" "}
            <span className="text-zinc-600">({images.length})</span>
          </h2>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Načítám…</p>
        ) : images.length === 0 ? (
          <p className="text-zinc-600 text-sm">Zatím žádné vygenerované obrázky.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group"
              >
                {/* Image thumbnail */}
                <div className="relative aspect-square bg-zinc-800">
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <a
                      href={img.url}
                      download
                      className="bg-zinc-100 text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                    >
                      ↓ Stáhnout
                    </a>
                    <button
                      onClick={() => deleteImage(img.id)}
                      disabled={deletingId === img.id}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === img.id ? "…" : "Smazat"}
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-3">
                  <p className="text-zinc-300 text-xs line-clamp-2 leading-relaxed">
                    {img.prompt}
                  </p>
                  <p className="text-zinc-600 text-xs mt-1.5">
                    {img.width}×{img.height} ·{" "}
                    {new Date(img.createdAt).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
