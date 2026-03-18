"use client";

import { useEffect } from "react";
import { useGlyph } from "@use-glyph/sdk-react";

interface Props {
  onAddress: (address: string | undefined) => void;
  onUsername?: (name: string | null) => void;
}

/**
 * Reads the connected Glyph wallet address and username, reports them upward.
 * This component is always dynamically imported with ssr:false so
 * the Glyph SDK (browser-only) never runs during SSR.
 */
export function GlyphUserSync({ onAddress, onUsername }: Props) {
  const { user, authenticated } = useGlyph();

  useEffect(() => {
    const u = user as any;
    // evmWallet can be a string (v2 type) or an object with .address
    const wallet = u?.evmWallet;
    const address = authenticated ? (typeof wallet === "string" ? wallet : wallet?.address) : undefined;
    onAddress(address);
    onUsername?.(authenticated && u?.name ? u.name : null);
  }, [authenticated, user, onAddress, onUsername]);

  return null;
}
