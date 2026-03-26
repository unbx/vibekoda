"use client";

import { useEffect } from "react";
import { useGlyph } from "@use-glyph/sdk-react";

interface Props {
  onAddress: (address: string | undefined) => void;
  onUsername?: (name: string | null) => void;
}

/**
 * Reads the connected wallet address and username from the Glyph SDK context.
 * With the Privy strategy, both come from the authenticated Glyph user.
 * This component is always dynamically imported with ssr:false.
 */
export function GlyphUserSync({ onAddress, onUsername }: Props) {
  const { user, authenticated, ready } = useGlyph();

  useEffect(() => {
    if (ready && authenticated && user?.evmWallet) {
      onAddress(user.evmWallet);
    } else {
      onAddress(undefined);
    }
  }, [ready, authenticated, user, onAddress]);

  useEffect(() => {
    if (ready && authenticated && user?.name) {
      onUsername?.(user.name);
    } else {
      onUsername?.(null);
    }
  }, [ready, authenticated, user, onUsername]);

  return null;
}
