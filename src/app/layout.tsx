import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Ateliér — Marketingové studio",
  description: "Lokální AI studio pro tvorbu marketingového obsahu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full">
      <body className={`${inter.className} h-full bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
