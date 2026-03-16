"use client";

import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2 } from "lucide-react";

export function WalletButton() {
  const { user, authenticated, ready } = useGlyph();
  const { connect, disconnect } = useNativeGlyphConnection();

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-xs font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (authenticated && user?.evmWallet?.address) {
    const addr = user.evmWallet.address;
    const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-600/10 text-xs font-mono text-purple-300">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {short}
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-600/15 hover:bg-purple-600/30 text-xs font-mono text-purple-300 hover:text-white transition-all"
    >
      <Wallet className="w-3.5 h-3.5" />
      Connect Glyph
    </button>
  );
}
