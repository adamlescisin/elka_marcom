"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Brand = { id: string; name: string; slug: string; kind: string };

const FORMATS = [
  { value: "single_post", label: "Příspěvek" },
  { value: "carousel", label: "Karusel" },
  { value: "reel", label: "Reel" },
  { value: "ad", label: "Reklama" },
  { value: "email", label: "E-mail" },
];

const OBJECTIVES = [
  { value: "awareness", label: "Povědomí o značce" },
  { value: "sale", label: "Prodej / sleva" },
  { value: "new_product", label: "Nový produkt" },
  { value: "seasonal", label: "Sezónní příležitost" },
  { value: "restock", label: "Naskladnění" },
  { value: "engagement", label: "Zapojení komunity" },
];

export default function NewContentForm({
  brands,
  defaultBrandSlug,
}: {
  brands: Brand[];
  defaultBrandSlug?: string;
}) {
  const router = useRouter();
  const defaultBrand = brands.find((b) => b.slug === defaultBrandSlug) ?? brands[0];

  const [brandId, setBrandId] = useState(defaultBrand?.id ?? "");
  const [format, setFormat] = useState("single_post");
  const [objective, setObjective] = useState("awareness");
  const [briefPrompt, setBriefPrompt] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [numSlides, setNumSlides] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedBrand = brands.find((b) => b.id === brandId);
  const isEcommerce = selectedBrand?.kind === "ecommerce";
  const isCarousel = format === "carousel";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId,
        format,
        objective,
        briefPrompt,
        sourceUrl: sourceUrl || undefined,
        numSlides: isCarousel ? numSlides : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/content/${data.contentId}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Generování selhalo. Zkontrolujte, zda běží Ollama.");
      setGenerating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Brand */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Značka</label>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Formát</label>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormat(f.value)}
              className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                format === f.value
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Carousel slides */}
      {isCarousel && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Počet snímků: {numSlides}
          </label>
          <input
            type="range"
            min={3}
            max={10}
            value={numSlides}
            onChange={(e) => setNumSlides(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>3</span>
            <span>10</span>
          </div>
        </div>
      )}

      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cíl</label>
        <select
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {OBJECTIVES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Product / page URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          URL produktu nebo stránky{" "}
          <span className="text-zinc-500 font-normal">(volitelné)</span>
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://example.cz/produkt/..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-zinc-600 mt-1">
          Fotka produktu z URL bude použita jako reference při generování AI vizuálu.
        </p>
      </div>

      {/* Brief */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Brief{" "}
          <span className="text-zinc-500 font-normal">
            — co chcete sdělit, jaký tón, zvláštní požadavky
          </span>
        </label>
        <textarea
          value={briefPrompt}
          onChange={(e) => setBriefPrompt(e.target.value)}
          required
          rows={4}
          placeholder={
            isEcommerce
              ? "Nový produkt, jarní kolekce, zvýrazni kvalitu materiálu…"
              : "Nová kolekce kabátů, podzim, elegantní styl…"
          }
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-3 py-2.5 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={generating || !briefPrompt.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
      >
        {generating ? "Generuji obsah… (může trvat 30–90s)" : "Generovat obsah"}
      </button>
    </form>
  );
}
