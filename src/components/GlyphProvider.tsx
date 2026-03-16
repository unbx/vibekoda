"use client";

import { GlyphWalletProvider } from "@use-glyph/sdk-react";
import { apeChain } from "viem/chains";

export function GlyphProvider({ children }: { children: React.ReactNode }) {
  return (
    <GlyphWalletProvider config={{ chains: [apeChain] }}>
      {children}
    </GlyphWalletProvider>
  );
}
