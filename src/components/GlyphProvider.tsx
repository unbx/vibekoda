"use client";

import { GlyphWalletProvider } from "@use-glyph/sdk-react";

/**
 * EIP1193 strategy with askForSignature={false} so we can split the flow
 * into two user-initiated steps:
 *   1. connect() from useNativeGlyphConnection → opens wallet popup
 *   2. login() from useGlyph() → triggers signature/auth (separate user click)
 *
 * This avoids browser popup blocking (each popup is user-initiated).
 *
 * Once Glyph whitelists vibekoda.nanalifestyle.com in their Privy dashboard,
 * switch to GlyphPrivyProvider for zero-popup in-page social login:
 *
 *   import { GlyphPrivyProvider, GLYPH_PRIVY_APP_ID } from "@use-glyph/sdk-react";
 *   <GlyphPrivyProvider appId={GLYPH_PRIVY_APP_ID} config={{
 *     appearance: { theme: "dark" },
 *     loginMethodsAndOrder: { primary: ["apple", "email", "google", "twitter", "metamask"] },
 *   }}>
 */
export function GlyphProvider({ children }: { children: React.ReactNode }) {
  return (
    <GlyphWalletProvider askForSignature={false}>
      {children}
    </GlyphWalletProvider>
  );
}
