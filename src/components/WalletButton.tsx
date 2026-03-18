"use client";

import { useState, useEffect, useCallback } from "react";
import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle } from "lucide-react";

export function WalletButton({ onExposeActions }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void } = {}) {
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

  const handleConnect = useCallback(() => {
    setPopupBlocked(false);
    setConnecting(true);

    // Timeout: reset button if connect() never resolves (e.g. popup closed)
    const timeout = setTimeout(() => setConnecting(false), 60000);

    // Call connect() synchronously within the click handler so the browser
    // treats the popup as a user-initiated gesture (async/await loses this).
    Promise.resolve(connect()).then(
      () => { clearTimeout(timeout); setConnecting(false); },
      (err: any) => {
        clearTimeout(timeout);
        const msg = err?.message?.toLowerCase() || "";
        if (msg.includes("popup") || msg.includes("blocked") || msg.includes("denied")) {
          setPopupBlocked(true);
        }
        console.warn("[Glyph] Connect error:", err);
        setConnecting(false);
      }
    );
  }, [connect]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect });
    }
  }, [onExposeActions, handleConnect, disconnect]);

  // Show loading only briefly
  if (!ready && !timedOut) {
    return (
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="font-display-light text-[9px] tracking-[0.15em]">LOADING...</span>
      </div>
    );
  }

  if (authenticated && u) {
    // GlyphWidgetUser: { name, evmWallet (string | {address}), picture, ... }
    const wallet = typeof u.evmWallet === "string" ? u.evmWallet : u.evmWallet?.address;
    const shortAddr = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : null;
    const label = u.name || shortAddr || "Connected";

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {label}
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
