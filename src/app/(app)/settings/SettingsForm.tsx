"use client";

import { useState } from "react";

type Brand = {
  id: string;
  slug: string;
  name: string;
  metaPageId: string | null;
  igUserId: string | null;
  wooBaseUrl: string | null;
};

export default function SettingsForm({
  brands,
  tokenStatus,
}: {
  brands: Brand[];
  tokenStatus: Record<string, boolean>;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [brandForms, setBrandForms] = useState<
    Record<string, { metaPageId: string; igUserId: string; accessToken: string }>
  >(
    Object.fromEntries(
      brands.map((b) => [
        b.id,
        { metaPageId: b.metaPageId ?? "", igUserId: b.igUserId ?? "", accessToken: "" },
      ])
    )
  );

  function updateBrandForm(
    brandId: string,
    field: "metaPageId" | "igUserId" | "accessToken",
    value: string
  ) {
    setBrandForms((prev) => ({
      ...prev,
      [brandId]: { ...prev[brandId], [field]: value },
    }));
  }

  async function saveBrandSettings(brand: Brand) {
    setSaving(brand.id);
    const form = brandForms[brand.id];

    // Save page/IG IDs
    const brandRes = await fetch(`/api/brands/${brand.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaPageId: form.metaPageId, igUserId: form.igUserId }),
    });

    // Save Meta token if provided
    if (form.accessToken) {
      const tokenRes = await fetch(`/api/settings/meta-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id, accessToken: form.accessToken }),
      });
      if (!tokenRes.ok) {
        setMessage("Chyba ukládání tokenu.");
        setSaving(null);
        setTimeout(() => setMessage(""), 3000);
        return;
      }
    }

    setMessage(brandRes.ok ? "Nastavení uloženo." : "Chyba ukládání.");
    setSaving(null);
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-4 py-2.5 text-sm">
          {message}
        </div>
      )}

      {brands.map((brand) => {
        const form = brandForms[brand.id];
        const hasToken = tokenStatus[brand.id];

        return (
          <div key={brand.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-100">{brand.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-md ${
                  hasToken
                    ? "bg-green-900 text-green-300"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {hasToken ? "Meta token ✓" : "Bez tokenu"}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Facebook Page ID
                </label>
                <input
                  value={form.metaPageId}
                  onChange={(e) => updateBrandForm(brand.id, "metaPageId", e.target.value)}
                  placeholder="123456789"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Instagram Business User ID
                </label>
                <input
                  value={form.igUserId}
                  onChange={(e) => updateBrandForm(brand.id, "igUserId", e.target.value)}
                  placeholder="987654321"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Meta přístupový token{" "}
                  <span className="text-zinc-500 font-normal">(long-lived Page token)</span>
                </label>
                <input
                  type="password"
                  value={form.accessToken}
                  onChange={(e) => updateBrandForm(brand.id, "accessToken", e.target.value)}
                  placeholder={hasToken ? "••••••• (změnit)" : "Vložte token…"}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Token je šifrován (AES-256-GCM) před uložením do databáze.
                </p>
              </div>
            </div>

            <button
              onClick={() => saveBrandSettings(brand)}
              disabled={saving === brand.id}
              className="mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving === brand.id ? "Ukládám…" : "Uložit"}
            </button>
          </div>
        );
      })}

      {/* System info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-semibold text-zinc-100 mb-3">Systém</h3>
        <div className="space-y-1.5 text-sm text-zinc-400">
          <p>
            Model:{" "}
            <span className="text-zinc-200">{process.env.OLLAMA_MODEL ?? "qwen3:14b"}</span>
          </p>
          <p>
            Ollama:{" "}
            <span className="text-zinc-200">
              {process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}
            </span>
          </p>
          <p>
            Databáze: <span className="text-zinc-200">SQLite (Prisma)</span>
          </p>
        </div>
      </div>
    </div>
  );
}
