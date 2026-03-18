"use client";

import { useState, useEffect, useCallback } from "react";
import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle } from "lucide-react";

export function WalletButton() {
  const { user, authenticated, ready } = useGlyph();
  const { connect, disconnect } = useNativeGlyphConnection();
  const [timedOut, setTimedOut] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Glyph SDK v2 types are loose — cast user to access wallet fields
  const u = user as any;

  // If Glyph SDK doesn't become ready after 4s, show the connect button anyway
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    if (ready) clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [ready]);

  const handleConnect = useCallback(async () => {
    setPopupBlocked(false);
    setConnecting(true);
    try {
      await connect();
    } catch (err: any) {
      // Detect popup blocker — the error message varies by browser
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("popup") || msg.includes("blocked") || msg.includes("denied")) {
        setPopupBlocked(true);
      }
      console.warn("[Glyph] Connect error:", err);
    } finally {
      setConnecting(false);
    }
  }, [connect]);

  // Show loading only briefly
  if (!ready && !timedOut) {
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn-otherside-outline flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-[0.12em]"
      >
        {connecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wallet className="w-3.5 h-3.5" />
        )}
        {connecting ? "CONNECTING..." : "CONNECT GLYPH"}
      </button>
      {popupBlocked && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/20 text-[10px] text-amber-300">
          <AlertTriangle className="w-3 h-3" />
          <span>Allow popups for this site</span>
        </div>
      )}
    </div>
  );
}
