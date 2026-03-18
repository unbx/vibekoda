"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, CheckCircle2, Sparkles, Loader2, Plus, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Message } from "@/lib/ai";

interface ChatInterfaceProps {
  onGenerate: (messages: Message[], apiKey: string, endpoint: string, model: string) => Promise<void>;
  isGenerating: boolean;
  onNewObject: () => void;
}

interface ChatBubble {
  role: "user" | "assistant";
  text: string;
}

const AI_SETTINGS_KEY = "vibekoda_ai_settings";

function loadAiSettings() {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "null");
  } catch {
    return null;
  }
}

function saveAiSettings(settings: { provider: string; apiKey: string; endpoint: string; model: string }) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

export function ChatInterface({ onGenerate, isGenerating, onNewObject }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showApiNudge, setShowApiNudge] = useState(false);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "custom">("openai");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-4o-mini");
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([]);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = loadAiSettings();
    if (saved) {
      if (saved.provider) setProvider(saved.provider);
      if (saved.apiKey) setApiKey(saved.apiKey);
      if (saved.endpoint) setEndpoint(saved.endpoint);
      if (saved.model) setModel(saved.model);
    }
    setSettingsLoaded(true);
  }, []);

  // Persist settings whenever they change (after initial load)
  useEffect(() => {
    if (!settingsLoaded) return;
    saveAiSettings({ provider, apiKey, endpoint, model });
  }, [provider, apiKey, endpoint, model, settingsLoaded]);

  const handleProviderChange = (newProvider: "openai" | "anthropic" | "custom") => {
    setProvider(newProvider);
    if (newProvider === "openai") {
      setEndpoint("https://api.openai.com/v1/chat/completions");
      setModel("gpt-4o-mini");
    } else if (newProvider === "anthropic") {
      setEndpoint("https://api.anthropic.com/v1/messages");
      setModel("claude-opus-4-6");
    } else {
      setEndpoint("");
      setModel("");
    }
  };

  // Expose settings opener for SetupPanel
  useEffect(() => {
    (window as any).__openAiSettings = () => setShowSettings(true);
    return () => { delete (window as any).__openAiSettings; };
  });

  const handleNewObject = () => {
    setChatHistory([]);
    setMessageHistory([]);
    onNewObject();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!apiKey) {
      setShowApiNudge(true);
      setTimeout(() => setShowApiNudge(false), 5000);
      return;
    }

    setShowApiNudge(false);
    const userMessage = prompt.trim();
    setPrompt("");
    setChatHistory(prev => [...prev, { role: "user", text: userMessage }]);
    const newMessages: Message[] = [...messageHistory, { role: "user", content: userMessage }];
    setMessageHistory(newMessages);
    await onGenerate(newMessages, apiKey, endpoint, model);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const addAssistantMessage = (text: string) => {
    setChatHistory(prev => [...prev, { role: "assistant", text }]);
    setMessageHistory(prev => [...prev, { role: "assistant", content: text }]);
  };

  useEffect(() => {
    (window as any).__addAssistantMessage = addAssistantMessage;
    return () => { delete (window as any).__addAssistantMessage; };
  });

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">
          <span className="diamond-icon" />OBJECT BUILDER
        </span>
        <button
          onClick={handleNewObject}
          className="btn-otherside-outline flex items-center gap-1.5 px-3 py-1.5 text-[10px]"
        >
          <Plus className="w-3 h-3" /> NEW
        </button>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute z-30 top-14 left-3 right-3 bg-[#0c0a14] p-5 rounded-2xl border border-[var(--panel-border)] shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display-light text-[11px] tracking-[0.15em] text-[var(--primary-light)] flex items-center gap-2">
                <Settings className="w-4 h-4" /> BRING YOUR OWN AGENT
              </h3>
              <button onClick={() => setShowSettings(false)} className="text-[var(--text-muted)] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)] block mb-1.5">API PROVIDER</label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as any)}
                  className="w-full bg-black/50 border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors appearance-none"
                >
                  <option value="openai">OpenAI (Default)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="custom">Custom Endpoint</option>
                </select>
              </div>

              <div>
                <label className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)] flex items-center justify-between mb-1.5">
                  <span>API KEY</span>
                  {provider !== "custom" && <span className="text-[var(--primary)]/40">LOCAL ONLY</span>}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === "openai" ? "sk-proj-..." : provider === "anthropic" ? "sk-ant-..." : "API Key"}
                  className="w-full bg-black/50 border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                />
              </div>

              <div>
                <label className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)] block mb-1.5">ENDPOINT URL</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black/50 border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                />
              </div>

              <div>
                <label className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)] block mb-1.5">MODEL</label>
                {provider === "custom" ? (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g., local-model-name"
                    className="w-full bg-black/50 border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
                  />
                ) : (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-black/50 border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--primary)]/50 transition-colors appearance-none"
                  >
                    {provider === "openai" && (
                      <optgroup label="OpenAI Models">
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast)</option>
                        <option value="gpt-4o">gpt-4o (Capable)</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                      </optgroup>
                    )}
                    {provider === "anthropic" && (
                      <optgroup label="Anthropic Models">
                        <option value="claude-opus-4-6">Claude Opus 4.6</option>
                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                        <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                      </optgroup>
                    )}
                  </select>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="btn-otherside w-full mt-4 py-2.5 text-[11px] tracking-[0.15em] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> SAVE SETTINGS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--panel-border)] rounded-tl-sm">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 animate-pulse-glow mb-3">
              <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Hey creator! I&apos;m your <span className="text-[var(--primary-light)] font-semibold text-glow">VibeKoda</span>
              <br /><br />
              Tell me what you want to build for the Otherside and I&apos;ll craft the MML. Keep chatting to refine it — I&apos;ll remember everything. Hit <span className="text-[var(--primary-light)] font-medium">New</span> when you&apos;re ready for something fresh.
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 mt-1 animate-pulse-glow">
                <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--primary)]/20 text-[var(--primary-light)] rounded-br-sm border border-[var(--primary)]/15"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] rounded-bl-sm border border-[var(--panel-border)]"
              }`}
            >
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-lg bg-[var(--surface)] flex items-center justify-center shrink-0 mt-1 border border-[var(--panel-border)]">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </div>
            )}
          </motion.div>
        ))}

        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 animate-pulse-glow">
              <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--panel-border)] px-4 py-2.5 rounded-2xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* API Key Nudge */}
      <AnimatePresence>
        {showApiNudge && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 bg-amber-950/30 border-t border-amber-500/20 shrink-0"
          >
            <p className="text-[11px] text-amber-300 font-mono">
              Add your AI API key to start generating{" "}
              <button
                onClick={() => { setShowApiNudge(false); setShowSettings(true); }}
                className="underline text-[var(--primary-light)] hover:text-white transition-colors"
              >
                Open Settings →
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`absolute left-3 p-2 rounded-full transition-colors ${
              apiKey ? "text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
            }`}
            title="Agent Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={apiKey ? (chatHistory.length > 0 ? "Refine this object..." : "Create a glowing portal...") : "Configure API settings first!"}
            disabled={isGenerating}
            className="w-full bg-black/40 border border-[var(--panel-border)] focus:border-[var(--primary)]/40 rounded-full py-3 pl-12 pr-14 text-sm text-white focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 p-2 btn-otherside rounded-full disabled:opacity-30"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
