"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, RefreshCw, Radio, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type World = "SWAMP" | "NEXUS";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp?: string;
  isBot?: boolean;
}

interface WorldChatProps {
  currentMmlDescription?: string;
  glyphUsername?: string | null;
  glyphConnected?: boolean;
}

const PROXY_URL = "/api/world-chat";
const POLL_INTERVAL = 8000;

export function WorldChat({ currentMmlDescription, glyphUsername, glyphConnected }: WorldChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [world, setWorld] = useState<World>("NEXUS");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChat = useCallback(async (selectedWorld: World, silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${PROXY_URL}?world=${selectedWorld}&page=1&limit=25`
      );

      if (res.status === 402) {
        setError("API requires payment (x402). Open during developer preview.");
        return;
      }

      if (!res.ok) {
        setError(`Error ${res.status}: Could not fetch world chat.`);
        return;
      }

      const data = await res.json();
      const rawMessages: ChatMessage[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data?.data)
        ? data.data
        : [];

      // Reverse so oldest are at top, newest at bottom
      const normalized = rawMessages.map((m, i) => ({
        id: m.id || String(i),
        username: m.username || "unknown",
        message: m.message || "",
        timestamp: m.timestamp,
        isBot: m.username?.toLowerCase().includes("bot") || m.isBot,
      }));

      setMessages(normalized.reverse());
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) setError("Failed to reach the Otherside API. Check your network.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    fetchChat(world);
    pollRef.current = setInterval(() => fetchChat(world, true), POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, world, fetchChat]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleWorldSwitch = (w: World) => {
    setWorld(w);
    setMessages([]);
  };

  const broadcastName = glyphUsername || "Hapa";

  const handleBroadcast = async () => {
    const msg = broadcastMsg.trim();
    if (!msg) return;
    setIsBroadcasting(true);
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: broadcastName, message: msg, world }),
      });
      if (res.ok || res.status === 402) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          username: broadcastName,
          message: msg,
          isBot: false,
          timestamp: new Date().toISOString(),
        }]);
        setBroadcastMsg("");
      } else {
        setError(`Broadcast failed: ${res.status}`);
      }
    } catch {
      setError("Broadcast failed. Check network.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const timeAgo = (ts?: string) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      return `${Math.floor(diff / 3600)}h ago`;
    } catch { return ""; }
  };

  return (
    <section
      className={`shrink-0 flex flex-col border-l border-[var(--primary)]/15 bg-[rgba(16,13,28,0.95)] transition-all ${
        isOpen ? "w-[320px] min-w-[280px]" : "w-10"
      } overflow-hidden`}
    >
      {/* Collapsed: vertical label strip */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center justify-center gap-2 h-full w-full py-4 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--primary)]/5 transition-colors"
          title="Open World Chat"
        >
          <Radio className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
          <span className="text-[9px] font-display-light tracking-[0.15em] [writing-mode:vertical-rl] rotate-180">WORLD CHAT</span>
          {messages.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>
      )}

      {isOpen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--primary)]/15 bg-[var(--primary)]/5 shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
              <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">WORLD CHAT</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* World Selector */}
          <div className="flex border-b border-[var(--primary)]/10 shrink-0">
            {(["SWAMP", "NEXUS"] as World[]).map(w => (
              <button
                key={w}
                onClick={() => handleWorldSwitch(w)}
                className={`flex-1 py-2 text-[10px] font-display-light tracking-[0.15em] transition-all ${
                  world === w
                    ? "bg-[var(--primary)]/20 text-[var(--primary-light)] border-b-2 border-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] shrink-0">
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              {lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : "Connecting..."}
            </span>
            <button
              onClick={() => fetchChat(world)}
              disabled={isLoading}
              className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Messages — oldest at top, newest at bottom */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && messages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <div className="text-center space-y-3">
                  <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin mx-auto" />
                  <p className="text-xs text-[var(--text-muted)] font-mono">Tuning into {world}...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {!isLoading && !error && messages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs text-[var(--text-muted)] font-mono text-center">No chat messages in {world} yet.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`group rounded-lg px-3 py-2.5 ${
                msg.username === broadcastName
                  ? "bg-[var(--primary)]/15 border border-[var(--primary)]/25"
                  : "bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.04] transition-colors"
              }`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] font-semibold ${
                    msg.username === broadcastName ? "text-[var(--primary-light)]" : "text-[var(--text-secondary)]"
                  }`}>
                    {msg.username}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {timeAgo(msg.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-200 leading-relaxed">{msg.message}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Broadcast — only when Glyph is connected */}
          {glyphConnected ? (
            <div className="border-t border-[var(--primary)]/15 bg-[var(--primary)]/5 p-3 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !isBroadcasting && handleBroadcast()}
                  placeholder={`Message as ${broadcastName}...`}
                  className="flex-1 bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
                <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || !broadcastMsg.trim()}
                  className="px-3 py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 border border-[var(--primary)]/30 rounded-lg text-[var(--primary-light)] hover:text-white transition-all disabled:opacity-30"
                  title={`Broadcast as ${broadcastName}`}
                >
                  {isBroadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[9px] text-[var(--text-muted)] mt-1.5 font-mono">
                Broadcasting as <span className="text-[var(--primary-light)]">{broadcastName}</span>
              </p>
            </div>
          ) : (
            <div className="border-t border-white/[0.06] px-4 py-3 shrink-0">
              <p className="text-[10px] text-amber-300/80 font-mono text-center">
                Connect Glyph to chat in the Otherside
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
