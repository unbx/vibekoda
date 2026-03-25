"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";

interface Props {
  onAddress: (address: string | undefined) => void;
  onUsername?: (name: string | null) => void;
}

/**
 * Reads the connected wallet address via wagmi and reports it upward.
 * This component is always dynamically imported with ssr:false so
 * wagmi (browser-only config) never runs during SSR.
 */
export function GlyphUserSync({ onAddress, onUsername }: Props) {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    onAddress(isConnected && address ? address : undefined);
    // wagmi doesn't provide usernames — clear it
    onUsername?.(null);
  }, [isConnected, address, onAddress, onUsername]);

  return null;
}
