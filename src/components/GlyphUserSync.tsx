"use client";

import { useEffect } from "react";
import { useGlyph } from "@use-glyph/sdk-react";
import { useAccount } from "wagmi";

interface Props {
  onAddress: (address: string | undefined) => void;
  onUsername?: (name: string | null) => void;
}

/**
 * Syncs wallet address and Glyph username to parent state.
 *
 * With EIP1193 strategy (two-step flow):
 *   - Address comes from wagmi (available after Step 1: wallet connect)
 *   - Username comes from useGlyph user (available after Step 2: verify/sign)
 */
export function GlyphUserSync({ onAddress, onUsername }: Props) {
  const { user, authenticated, ready } = useGlyph();
  const { address, isConnected } = useAccount();

  // Address from wagmi — available as soon as wallet is connected (Step 1)
  useEffect(() => {
    if (isConnected && address) {
      onAddress(address);
    } else {
      onAddress(undefined);
    }
  }, [isConnected, address, onAddress]);

  // Username from Glyph — available after authentication (Step 2)
  useEffect(() => {
    if (ready && authenticated && user?.name) {
      onUsername?.(user.name);
    } else {
      onUsername?.(null);
    }
  }, [ready, authenticated, user, onUsername]);

  return null;
}
