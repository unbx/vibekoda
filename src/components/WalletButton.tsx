"use client";

import { useEffect, useCallback } from "react";
import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { useAccount } from "wagmi";

export function WalletButton({
  onExposeActions,
  displayName,
}: {
  onExposeActions?: (actions: {
    connect: () => void;
    disconnect: () => void;
  }) => void;
  displayName?: string | null;
} = {}) {
  const { login, logout, authenticated, ready, user } = useGlyph();
  const { connect, disconnect: nativeDisconnect } = useNativeGlyphConnection();
  const { isConnected, address } = useAccount();

  const shortAddr = (user?.evmWallet || address)
    ? `${(user?.evmWallet || address)!.slice(0, 6)}...${(user?.evmWallet || address)!.slice(-4)}`
    : null;

  // Step 1: Open Glyph popup to connect wallet
  const handleConnect = useCallback(() => {
    connect();
  }, [connect]);

  // Step 2: Sign message to verify identity & get Glyph username
  const handleVerify = useCallback(() => {
    login();
  }, [login]);

  const handleDisconnect = useCallback(() => {
    logout();
    nativeDisconnect();
  }, [logout, nativeDisconnect]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  // ── State 3: Fully authenticated with Glyph ──
  if (authenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {displayName || user.name || shortAddr || "Connected"}
        </div>
        <button
          onClick={handleDisconnect}
          className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── State 2: Wallet connected, but not yet verified with Glyph ──
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleVerify}
          className="btn-otherside-outline flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-[0.12em] border-green-500/50 hover:border-green-400"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          SIGN &amp; CONTINUE
        </button>
        <button
          onClick={handleDisconnect}
          className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── State 1: Not connected ──
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={!ready}
        className="btn-otherside-outline flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-[0.12em]"
      >
        {!ready ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wallet className="w-3.5 h-3.5" />
        )}
        {!ready ? "LOADING..." : "CONNECT GLYPH"}
      </button>
    </div>
  );
}
