"use client";

import dynamic from "next/dynamic";

// Load GlyphProvider only in the browser — it has browser-only deps that crash SSR
const GlyphProvider = dynamic(
  () => import("./GlyphProvider").then(m => ({ default: m.GlyphProvider })),
  { ssr: false, loading: () => null }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <GlyphProvider>{children}</GlyphProvider>;
}
