"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.push(redirect);
    } else {
      const data = await res.json();
      setError(data.error ?? "Přihlášení selhalo.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">Ateliér</h1>
          <p className="text-zinc-400 mt-2 text-sm">Marketingové studio</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="vas@email.cz"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? "Přihlašuji…" : "Přihlásit se"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
