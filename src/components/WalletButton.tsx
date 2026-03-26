"use client";

import { useEffect, useCallback } from "react";
import { useGlyph } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2 } from "lucide-react";

export function WalletButton({ onExposeActions, displayName }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void; displayName?: string | null } = {}) {
  const { login, logout, authenticated, ready, user } = useGlyph();

  const shortAddr = user?.evmWallet
    ? `${user.evmWallet.slice(0, 6)}...${user.evmWallet.slice(-4)}`
    : null;

  const handleConnect = useCallback(() => {
    login();
  }, [login]);

  const handleDisconnect = useCallback(() => {
    logout();
  }, [logout]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  // ── Connected state ──
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

  // ── Disconnected state ──
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
