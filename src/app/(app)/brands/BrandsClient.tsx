"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  dna: string;
  _count: { contents: number };
};

export default function BrandsClient({ initialBrands }: { initialBrands: Brand[] }) {
  const router = useRouter();
  const [brands, setBrands] = useState(initialBrands);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("ecommerce");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, websiteUrl }),
    });
    if (res.ok) {
      const brand = await res.json();
      setBrands((prev) => [...prev, { ...brand, _count: { contents: 0 } }]);
      setName("");
      setWebsiteUrl("");
      setKind("ecommerce");
      setShowForm(false);
      router.push(`/brands/${brand.slug}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Chyba při vytváření značky.");
    }
    setCreating(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">Značky</h2>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? "Zrušit" : "+ Nová značka"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createBrand}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6 space-y-4"
        >
          <h3 className="font-medium text-zinc-200">Nová značka</h3>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Název</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Moje značka"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Typ</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ecommerce">E-shop</option>
                <option value="physical">Kamenný obchod</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL webu</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              type="url"
              placeholder="https://mojznacka.cz"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {creating ? "Vytvářím…" : "Vytvořit značku"}
          </button>
        </form>
      )}

      {brands.length === 0 && !showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-500 mb-3">Zatím žádné značky.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            + Vytvořit první značku
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {brands.map((brand) => {
          let dna: { tone?: string[]; audience?: string } = {};
          try { dna = JSON.parse(brand.dna); } catch {}

          return (
            <div key={brand.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
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
                    <span key={t} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md">
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
