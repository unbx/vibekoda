"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, RefreshCw, Radio, Loader2, ChevronLeft, ChevronRight, BarChart3, Users, MessageSquare, TrendingUp } from "lucide-react";

type World = "SWAMP" | "NEXUS";

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp?: string;
  isBot?: boolean;
}

export interface ChatAnalytics {
  messageCount: number;
  uniqueUsers: number;
  topUsers: { name: string; count: number }[];
  trendingKeywords: string[];
}

interface WorldChatProps {
  currentMmlDescription?: string;
  glyphUsername?: string | null;
  glyphConnected?: boolean;
  onAnalyticsUpdate?: (analytics: ChatAnalytics) => void;
}

const PROXY_URL = "/api/world-chat";
const POLL_INTERVAL = 8000;

// Stop-words to filter out of trending keywords
const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "i","you","he","she","it","we","they","me","him","her","us","them","my","your",
  "his","its","our","their","this","that","these","those","am","in","on","at","to",
  "for","of","with","and","but","or","not","no","so","if","then","than","too","very",
  "just","about","up","out","all","what","when","where","how","who","which","there",
  "here","from","by","as","into","like","get","got","lol","lmao","yeah","yea","yes",
  "no","ok","okay","oh","hey","hi","hello","yo","bruh","bro","gonna","gotta","dont",
  "im","ive","its","thats","whats","haha","hehe","omg","wow","pls","plz","thx","ty",
]);

function computeAnalytics(messages: ChatMessage[]): ChatAnalytics {
  const userCounts: Record<string, number> = {};
  const wordCounts: Record<string, number> = {};

  for (const msg of messages) {
    userCounts[msg.username] = (userCounts[msg.username] || 0) + 1;

    // Tokenize and count meaningful words (3+ chars, not stop-words)
    const words = msg.message.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/);
    for (const w of words) {
      if (w.length >= 3 && !STOP_WORDS.has(w)) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
  }

  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Only surface words that appear 2+ times
  const trendingKeywords = Object.entries(wordCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);

  return {
    messageCount: messages.length,
    uniqueUsers: Object.keys(userCounts).length,
    topUsers,
    trendingKeywords,
  };
}

export function WorldChat({ currentMmlDescription, glyphUsername, glyphConnected, onAnalyticsUpdate }: WorldChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const [world, setWorld] = useState<World>("NEXUS");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Compute analytics from messages
  const analytics = useMemo(() => computeAnalytics(messages), [messages]);

  // Notify parent of analytics updates (for dynamic suggestion chips)
  useEffect(() => {
    onAnalyticsUpdate?.(analytics);
  }, [analytics, onAnalyticsUpdate]);

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
    // On mobile, chat is always "open" when rendered (no collapsed state).
    // On desktop, only fetch when explicitly opened.
    const shouldFetch = isOpen || isMobile;
    if (!shouldFetch) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    fetchChat(world);
    pollRef.current = setInterval(() => fetchChat(world, true), POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, isMobile, world, fetchChat]);

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
      className={`shrink-0 flex flex-col border-l border-[var(--primary)]/15 bg-[rgba(16,13,28,0.95)] transition-all w-full lg:w-auto ${
        isOpen ? "lg:w-[320px] lg:min-w-[320px] lg:max-w-[320px]" : "lg:w-12"
      } overflow-hidden flex-1 lg:flex-initial`}
    >
      {/* Collapsed: vertical label strip with pink gradient pulse (desktop only) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden lg:flex flex-col items-center justify-center gap-3 h-full w-full py-6 text-[var(--text-secondary)] hover:text-white relative overflow-hidden transition-all group"
          title="Open World Chat"
        >
          {/* Pink gradient glow that pulses from the text outward */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(232, 75, 245, 0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0 animate-world-chat-glow"
            style={{
              background: "linear-gradient(180deg, transparent 10%, rgba(232, 75, 245, 0.08) 40%, rgba(232, 75, 245, 0.15) 50%, rgba(232, 75, 245, 0.08) 60%, transparent 90%)",
            }}
          />
          {/* Subtle side accent line with pink gradient */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px] animate-world-chat-line"
            style={{
              background: "linear-gradient(180deg, transparent 15%, var(--accent-pink) 45%, var(--primary) 55%, transparent 85%)",
            }}
          />

          <Radio className="w-5 h-5 text-[var(--accent-pink)] drop-shadow-[0_0_8px_rgba(232,75,245,0.5)] z-10 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-display-light tracking-[0.2em] text-[var(--primary-light)] [writing-mode:vertical-rl] rotate-180 z-10 group-hover:text-white transition-colors">WORLD CHAT</span>
          <span className="w-2 h-2 rounded-full bg-[var(--accent-pink)] animate-pulse shadow-[0_0_10px_rgba(232,75,245,0.6)] z-10" />
        </button>
      )}

      {(isOpen || isMobile) && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--primary)]/15 bg-[var(--primary)]/5 shrink-0">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
              <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">WORLD CHAT</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hidden lg:block text-[var(--text-muted)] hover:text-white transition-colors">
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(a => !a)}
                className={`transition-colors ${showAnalytics ? "text-[var(--accent-pink)]" : "text-[var(--text-muted)] hover:text-[var(--primary-light)]"}`}
                title="Toggle analytics"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => fetchChat(world)}
                disabled={isLoading}
                className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Analytics Panel — compact, toggleable */}
          {showAnalytics && messages.length > 0 && (
            <div className="border-b border-[var(--accent-pink)]/10 bg-[var(--accent-pink)]/[0.03] px-4 py-2.5 shrink-0 space-y-2">
              {/* Stats row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-[var(--accent-pink)]" />
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{analytics.messageCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-[var(--primary)]" />
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{analytics.uniqueUsers}</span>
                </div>
              </div>

              {/* Top users */}
              {analytics.topUsers.length > 0 && (
                <div>
                  <span className="text-[8px] font-display-light tracking-[0.15em] text-[var(--text-muted)]">TOP VOICES</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analytics.topUsers.slice(0, 3).map(u => (
                      <span key={u.name} className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-[var(--primary)]/10 text-[var(--primary-light)] border border-[var(--primary)]/15">
                        {u.name} <span className="text-[var(--text-muted)]">({u.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending keywords */}
              {analytics.trendingKeywords.length > 0 && (
                <div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-[var(--accent-pink)]" />
                    <span className="text-[8px] font-display-light tracking-[0.15em] text-[var(--text-muted)]">TRENDING</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analytics.trendingKeywords.map(kw => (
                      <span key={kw} className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-[var(--accent-pink)]/10 text-[var(--accent-pink)] border border-[var(--accent-pink)]/15">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                <p className="text-xs text-gray-200 leading-relaxed break-words overflow-hidden">{msg.message}</p>
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
                Login to chat in the Otherside
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
