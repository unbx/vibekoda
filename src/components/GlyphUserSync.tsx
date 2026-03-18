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
    // Glyph SDK v2 types are loose — cast user to access wallet fields
    const u = user as any;
    // evmWallet can be a string (v2 type) or an object with .address
    const wallet = u?.evmWallet;
    const address = authenticated ? (typeof wallet === "string" ? wallet : wallet?.address) : undefined;
    onAddress(address);
  }, [authenticated, user, onAddress]);

  return null;
}
