"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useGlyph } from "@use-glyph/sdk-react";

interface Props {
  onAddress: (address: string | undefined) => void;
  onUsername?: (name: string | null) => void;
}

/**
 * Reads the connected wallet address via wagmi, and attempts to
 * resolve the Glyph username via the Glyph SDK context.
 * This component is always dynamically imported with ssr:false.
 */
export function GlyphUserSync({ onAddress, onUsername }: Props) {
  const { address, isConnected } = useAccount();
  const { user, authenticated } = useGlyph();

  useEffect(() => {
    onAddress(isConnected && address ? address : undefined);
  }, [isConnected, address, onAddress]);

  // Try to resolve Glyph username from the SDK context
  useEffect(() => {
    const u = user as any;
    if (authenticated && u?.name) {
      onUsername?.(u.name);
    } else {
      onUsername?.(null);
    }
  }, [authenticated, user, onUsername]);

  return null;
}
