"use client";

import {
  GlyphPrivyProvider,
  GLYPH_PRIVY_APP_ID,
} from "@use-glyph/sdk-react";

export function GlyphProvider({ children }: { children: React.ReactNode }) {
  return (
    <GlyphPrivyProvider
      appId={GLYPH_PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
        },
        loginMethodsAndOrder: {
          primary: ["apple", "email", "google", "twitter", "metamask"],
        },
      }}
    >
      {children}
    </GlyphPrivyProvider>
  );
}
