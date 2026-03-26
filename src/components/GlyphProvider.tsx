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
        // NOTE: Custom loginMethodsAndOrder (apple, email, google, twitter, wallet)
        // is commented out until vibekoda.nanalifestyle.com is whitelisted in Glyph's
        // Privy dashboard. Without whitelisting, OAuth returns 403 "Origin not allowed".
        // Once whitelisted, uncomment to enable in-page social login (no popup):
        //
        // loginMethodsAndOrder: {
        //   primary: ["apple", "email", "google", "twitter", "metamask"],
        // },
      }}
    >
      {children}
    </GlyphPrivyProvider>
  );
}
