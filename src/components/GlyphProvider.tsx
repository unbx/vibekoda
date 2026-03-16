"use client";

import { GlyphWalletProvider } from "@use-glyph/sdk-react";
import { apeChain } from "viem/chains";

export function GlyphProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_GLYPH_APP_ID;

  if (!appId) {
    // No App ID set — skip Glyph provider, app still works with localStorage fallback
    return <>{children}</>;
  }

  return (
    <GlyphWalletProvider
      config={{
        appId,
        chains: [apeChain],
      }}
    >
      {children}
    </GlyphWalletProvider>
  );
}
