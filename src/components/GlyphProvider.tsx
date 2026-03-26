"use client";

import {
  GlyphPrivyProvider,
  GLYPH_PRIVY_APP_ID,
  GLYPH_APP_LOGIN_METHOD,
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
          primary: [GLYPH_APP_LOGIN_METHOD],
        },
      }}
    >
      {children}
    </GlyphPrivyProvider>
  );
}
