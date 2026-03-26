"use client";

import { GlyphWalletProvider } from "@use-glyph/sdk-react";

export function GlyphProvider({ children }: { children: React.ReactNode }) {
  return (
    <GlyphWalletProvider askForSignature={true}>
      {children}
    </GlyphWalletProvider>
  );
}
