import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { QueryProvider } from "@/lib/query-client";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitHub Repository Search",
  description: "GitHub のリポジトリを検索・閲覧できる Web アプリケーション",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 text-neutral-900">
        <Suspense fallback={null}>
          <QueryProvider>
            <header className="border-b border-neutral-200 bg-white">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  GitHub Repository Search
                </Link>
                <a
                  href="https://docs.github.com/ja/rest/search/search#search-repositories"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  API リファレンス
                </a>
              </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </QueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
