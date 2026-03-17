"use client";

import { useEffect } from "react";
import { useGlyph } from "@use-glyph/sdk-react";

interface Props {
  onAddress: (address: string | undefined) => void;
}

/**
 * Reads the connected Glyph wallet address and reports it upward.
 * This component is always dynamically imported with ssr:false so
 * the Glyph SDK (browser-only) never runs during SSR.
 */
export function GlyphUserSync({ onAddress }: Props) {
  const { user, authenticated } = useGlyph();

  useEffect(() => {
    const address = authenticated ? user?.evmWallet?.address : undefined;
    onAddress(address);
  }, [authenticated, user, onAddress]);

  return null;
}
