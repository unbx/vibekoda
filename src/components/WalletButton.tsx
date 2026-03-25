"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGlyph, useNativeGlyphConnection } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Clear stale Privy / cross-app connection data from localStorage so
 * the user can retry after a popup-blocked or half-finished auth flow.
 */
function clearStaleGlyphState() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("privy") ||
          key.startsWith("privy-caw") ||
          key.startsWith("wagmi") ||
          key.startsWith("rk-") ||
          key.includes("glyph"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    console.info("[Glyph] Cleared stale auth state (" + keysToRemove.length + " keys)");
  } catch {
    // localStorage may be unavailable — ignore
  }
}

export function WalletButton({ onExposeActions }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void } = {}) {
  const { user, authenticated, ready, login, logout } = useGlyph();
  const { connect, disconnect } = useNativeGlyphConnection();
  const [timedOut, setTimedOut] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Glyph SDK v2 types are loose — cast user to access wallet fields
  const u = user as any;

  // If Glyph SDK doesn't become ready after 4s, show the connect button anyway
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    if (ready) clearTimeout(timer);
    return () => clearTimeout(timer);
  }, [ready]);

  // When authenticated becomes true while we're in a connecting state,
  // the login succeeded — clear the connecting spinner.
  useEffect(() => {
    if (authenticated && connecting) {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      setConnecting(false);
      setPopupBlocked(false);
      setFailCount(0);
    }
  }, [authenticated, connecting]);

  const handleConnect = useCallback(() => {
    setPopupBlocked(false);
    setConnecting(true);

    // Safety timeout: reset button if flow never completes (popup closed, etc.)
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    connectTimeoutRef.current = setTimeout(() => {
      setConnecting(false);
      setFailCount((c) => c + 1);
    }, 30000);

    // Use login() (Privy-level auth) which opens a single popup/modal.
    // After login succeeds the SDK auto-reconnects the wagmi connector
    // via its InjectWagmiConnector, so no second popup is needed.
    try {
      login();
    } catch (err: any) {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("popup") || msg.includes("blocked") || msg.includes("denied")) {
        setPopupBlocked(true);
      }
      console.warn("[Glyph] Connect error:", err);
      setConnecting(false);
      setFailCount((c) => c + 1);
    }
  }, [login]);

  const handleDisconnect = useCallback(() => {
    try { disconnect(); } catch { /* wagmi disconnect may throw if not connected */ }
    try { logout(); } catch { /* privy logout may throw */ }
    setPopupBlocked(false);
    setConnecting(false);
    setFailCount(0);
  }, [disconnect, logout]);

  const handleReset = useCallback(() => {
    // Full reset: logout, clear stale state, allow retry
    handleDisconnect();
    clearStaleGlyphState();
    setPopupBlocked(false);
    setFailCount(0);
  }, [handleDisconnect]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    };
  }, []);

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
          onClick={handleDisconnect}
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
          <span>Allow popups, then retry</span>
        </div>
      )}
      {failCount > 0 && !connecting && (
        <button
          onClick={handleReset}
          title="Reset connection state and retry"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[10px] text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      )}
    </div>
  );
}
