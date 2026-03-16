"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, RefreshCw, Radio, Loader2 } from "lucide-react";

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
}

const PROXY_URL = "/api/world-chat";
const POLL_INTERVAL = 8000; // 8 seconds

export function WorldChat({ currentMmlDescription }: WorldChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [world, setWorld] = useState<World>("SWAMP");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
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
      // Normalize whatever shape the API returns
      const rawMessages: ChatMessage[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setMessages(rawMessages.map((m, i) => ({
        id: m.id || String(i),
        username: m.username || "unknown",
        message: m.message || "",
        timestamp: m.timestamp,
        isBot: m.username?.toLowerCase().includes("bot") || m.isBot,
      })));
      setLastUpdated(new Date());
    } catch (err) {
      if (!silent) setError("Failed to reach the Otherside API. Check your network.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Start/stop polling when panel opens/closes or world changes
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

  const handleBroadcast = async () => {
    const msg = broadcastMsg.trim() || (currentMmlDescription ? `VibeKoda just conjured something for ${world}! 🔮✨` : "VibeKoda says hello from the Studio! 🔮");
    setIsBroadcasting(true);
    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "VibeKoda", message: msg, world }),
      });
      if (res.ok || res.status === 402) {
        // Append locally for instant feedback
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          username: "VibeKoda",
          message: msg,
          isBot: true,
          timestamp: new Date().toISOString(),
        }]);
        setBroadcastMsg("");
        setShowBroadcast(false);
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
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border border-r-0 transition-all shadow-xl ${
          isOpen
            ? "bg-purple-700/80 border-purple-500/50 text-white"
            : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:bg-black/80"
        } backdrop-blur-md`}
        title="World Chat"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-[9px] font-mono tracking-wider [writing-mode:vertical-rl] text-center">WORLD CHAT</span>
        {messages.length > 0 && !isOpen && (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </button>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-80 z-30 flex flex-col border-l border-white/10 bg-[#090910]/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
                <span className="text-xs font-mono text-purple-300 tracking-wider">LIVE WORLD CHAT</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* World Selector */}
            <div className="flex border-b border-white/10 shrink-0">
              {(["SWAMP", "NEXUS"] as World[]).map(w => (
                <button
                  key={w}
                  onClick={() => handleWorldSwitch(w)}
                  className={`flex-1 py-2 text-xs font-mono font-semibold tracking-wider transition-all ${
                    world === w
                      ? "bg-purple-600/30 text-purple-300 border-b-2 border-purple-500"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 shrink-0">
              <span className="text-[10px] text-gray-600 font-mono">
                {lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : "Connecting..."}
              </span>
              <button
                onClick={() => fetchChat(world)}
                disabled={isLoading}
                className="text-gray-600 hover:text-purple-400 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-500 font-mono">Tuning into {world}...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {!isLoading && !error && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-gray-600 font-mono text-center">No chat messages in {world} yet.</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`group rounded-lg px-3 py-2 ${msg.isBot || msg.username === "VibeKoda" ? "bg-purple-900/20 border border-purple-500/20" : "bg-white/3 hover:bg-white/5 transition-colors"}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[11px] font-semibold ${msg.username === "VibeKoda" ? "text-purple-400" : "text-gray-400"}`}>
                      {msg.username === "VibeKoda" ? "🔮 VibeKoda" : msg.username}
                    </span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {timeAgo(msg.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{msg.message}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Broadcast Section */}
            <div className="border-t border-white/10 p-3 shrink-0 space-y-2">
              {showBroadcast && (
                <input
                  type="text"
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleBroadcast()}
                  placeholder={`Message to ${world}...`}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              )}
              <button
                onClick={() => showBroadcast ? handleBroadcast() : setShowBroadcast(true)}
                disabled={isBroadcasting}
                className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-all hover:text-white font-mono tracking-wider disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {showBroadcast ? `BROADCAST TO ${world}` : "BROADCAST AS VIBEKODA"}
              </button>
              {showBroadcast && (
                <button onClick={() => setShowBroadcast(false)} className="w-full text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
                  cancel
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
