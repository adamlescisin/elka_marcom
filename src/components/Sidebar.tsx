"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Přehled", icon: "⊞" },
  { href: "/content", label: "Obsah", icon: "✎" },
  { href: "/brands", label: "Značky", icon: "◈" },
  { href: "/analytics", label: "Analytika", icon: "◻" },
  { href: "/settings", label: "Nastavení", icon: "⚙" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-5 border-b border-zinc-800">
        <h1 className="font-bold text-lg text-zinc-100">Ateliér</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Marketingové studio</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {loggingOut ? "Odhlašuji…" : "Odhlásit se"}
        </button>
      </div>
    </aside>
  );
}
