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
 *   - Falls back to short wallet address if Glyph auth doesn't complete
 *     (e.g. domain not whitelisted in Privy dashboard)
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
  // Falls back to short address if Glyph SDK never authenticates
  useEffect(() => {
    if (ready && authenticated && user?.name) {
      onUsername?.(user.name);
    } else if (isConnected && address) {
      // Fallback: use short wallet address as display name so the app
      // doesn't get stuck waiting for Glyph auth that may never come
      const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
      onUsername?.(shortAddr);
    } else {
      onUsername?.(null);
    }
  }, [ready, authenticated, user, isConnected, address, onUsername]);

  return null;
}
