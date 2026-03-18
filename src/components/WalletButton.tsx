"use client";

import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2 } from "lucide-react";

export function WalletButton() {
  const { user, authenticated, ready } = useGlyph();
  const { connect, disconnect } = useNativeGlyphConnection();

  // Glyph SDK v2 types are loose — cast user to access wallet fields
  const u = user as any;

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-display-light text-[9px] tracking-[0.15em]">LOADING...</span>
      </div>
    );
  }

  if (authenticated && u?.evmWallet?.address) {
    const addr = u.evmWallet.address as string;
    const short = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {short}
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
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
      className="btn-otherside-outline flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-[0.12em]"
    >
      <Wallet className="w-3.5 h-3.5" />
      CONNECT
    </button>
  );
}
