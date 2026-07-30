"use client";

import { useState } from "react";
import type { BrandDNA } from "@/types/brand";

interface Props {
  brand: { id: string; slug: string; name: string; kind: string };
  initialDna: Partial<BrandDNA>;
  initialGoldExamples: { format: string; text: string }[];
}

export default function BrandDnaEditor({ brand, initialDna, initialGoldExamples }: Props) {
  const [dna, setDna] = useState<Partial<BrandDNA>>(initialDna);
  const [goldExamples, setGoldExamples] = useState(initialGoldExamples);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [extracting, setExtracting] = useState(false);

  function updateField<K extends keyof BrandDNA>(field: K, value: BrandDNA[K]) {
    setDna((prev) => ({ ...prev, [field]: value }));
  }

  function updateArrayField(field: keyof BrandDNA, value: string) {
    const arr = value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(field, arr as never);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/brands/${brand.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dna, goldExamples }),
    });
    setMessage(res.ok ? "Uloženo." : "Chyba při ukládání.");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function extractFromWeb() {
    setExtracting(true);
    const res = await fetch(`/api/brands/${brand.slug}/extract-dna`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setDna((prev) => ({ ...prev, ...data.dna }));
      setMessage("DNA extrahována z webu. Zkontrolujte a uložte.");
    } else {
      setMessage("Extrakce selhala.");
    }
    setExtracting(false);
    setTimeout(() => setMessage(""), 5000);
  }

  function addGoldExample() {
    setGoldExamples((prev) => [...prev, { format: "single_post", text: "" }]);
  }

  function updateGoldExample(i: number, field: "format" | "text", value: string) {
    setGoldExamples((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)));
  }

  function removeGoldExample(i: number) {
    setGoldExamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  const fieldConfig: Array<{
    key: keyof BrandDNA;
    label: string;
    multiline: boolean;
    isArray?: boolean;
  }> = [
    { key: "audience", label: "Cílová skupina", multiline: false },
    { key: "tone", label: "Tón (každý na nový řádek)", multiline: true, isArray: true },
    { key: "voice_rules", label: "Pravidla hlasu (každé na nový řádek)", multiline: true, isArray: true },
    { key: "banned_words", label: "Zakázaná slova (každé na nový řádek)", multiline: true, isArray: true },
    { key: "value_props", label: "Hodnoty značky (každá na nový řádek)", multiline: true, isArray: true },
    { key: "recurring_phrases", label: "Opakující se fráze (každá na nový řádek)", multiline: true, isArray: true },
    { key: "hashtag_bank", label: "Banka hashtagů (každý na nový řádek)", multiline: true, isArray: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          onClick={extractFromWeb}
          disabled={extracting}
          className="text-sm bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 px-4 py-2 rounded-lg transition-colors"
        >
          {extracting ? "Extrahuji z webu…" : "↓ Extrahovat DNA z webu"}
        </button>
      </div>

      {message && (
        <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2.5 text-sm">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {fieldConfig.map(({ key, label, multiline, isArray }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
            {multiline ? (
              <textarea
                value={
                  isArray
                    ? ((dna[key as keyof BrandDNA] as string[]) ?? []).join("\n")
                    : (dna[key as keyof BrandDNA] as string) ?? ""
                }
                onChange={(e) =>
                  isArray
                    ? updateArrayField(key as keyof BrandDNA, e.target.value)
                    : updateField(key as keyof BrandDNA, e.target.value as never)
                }
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            ) : (
              <input
                value={(dna[key as keyof BrandDNA] as string) ?? ""}
                onChange={(e) => updateField(key as keyof BrandDNA, e.target.value as never)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        ))}
      </div>

      {/* Gold examples */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-zinc-200">
            Zlaté příklady{" "}
            <span className="text-zinc-500 font-normal text-sm">
              — skutečné příspěvky, které považujete za vzorové
            </span>
          </h3>
          <button
            onClick={addGoldExample}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            + Přidat příklad
          </button>
        </div>

        <div className="space-y-3">
          {goldExamples.map((ex, i) => (
            <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <select
                  value={ex.format}
                  onChange={(e) => updateGoldExample(i, "format", e.target.value)}
                  className="bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-100 text-xs"
                >
                  {["single_post", "carousel", "reel", "ad", "email"].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeGoldExample(i)}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  Odebrat
                </button>
              </div>
              <textarea
                value={ex.text}
                onChange={(e) => updateGoldExample(i, "text", e.target.value)}
                rows={4}
                placeholder="Vložte skutečný text příspěvku…"
                className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
          ))}
          {goldExamples.length === 0 && (
            <p className="text-sm text-zinc-500">
              Zatím žádné příklady. Přidejte 3–5 vzorových příspěvků pro nejlepší výsledky.
            </p>
          )}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        {saving ? "Ukládám…" : "Uložit Brand DNA"}
      </button>
    </div>
  );
}
