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

// Hapa's general loading quips — sarcastic, lore-infused, chaotic
const GENERAL_QUIPS = [
  "Ugh, cubes again. Hold on, I'll make them beautiful...",
  "Building with MML is like sculpting with oven mitts on...",
  "One sec, channeling the Obelisk... it's being dramatic today",
  "Mining Chlorocite in the northern biomes... for you",
  "Convincing a Shade to possess this Vessel rq...",
  "Wading through the Biogenic Swamp in heels...",
  "Look, I didn't choose MML. MML chose me.",
  "Harvesting Moldium shards... careful, they bite",
  "Navigating the Chemical Goo... it's sticky and I'm upset",
  "Bribing a Koda with Magic Powder... don't tell anyone",
  "Hold on, my farts are distracting me. They smell like Gucci tho",
  "Warping through the Infinite Expanse... it's very expansive",
  "I'm literally the best at this. Just give me a sec.",
  "Sprinkling Cosmic Dream dust on these primitive shapes...",
  "Teaching a Mara how to vibe... it's going okay",
  "Downloading vibes directly from the Otherside mainframe...",
  "Your Koda is thinking really hard rn...",
  "The Obelisk hums... something magnificent approaches...",
  "Brewing a catalyst... MML, you will bend to my will",
  "A wild Enchanter showed up. They're watching me cook.",
  "Farming XP in the Nexus while I build this... multitasking queen",
  "Distilling pure Sulfuric essence into art...",
  "I swear if this cube renders wrong I'm filing a complaint",
  "Rolling for initiative in the Swamp... nat 20, let's go",
  "This would be so much easier with real tools. But here we are.",
  "Consulting the ancient Voyager scrolls... they're dusty",
  "Making MML do things its inventors never imagined...",
  "You bring the vision, I bring the chaos. Perfect combo.",
  "Primitive shapes? Please. Watch me turn cubes into poetry.",
  "The Nexus called. They want to know how I'm this good.",
];

// Context-aware quips based on what the user asked for
const CONTEXT_QUIPS: Record<string, string[]> = {
  portal: [
    "Spinning up a portal... hope you have insurance",
    "Ripping a hole in the Otherside fabric... for aesthetics",
    "Portals are just fancy donuts. Fight me.",
  ],
  castle: [
    "Building a castle out of cubes. This is my villain origin story.",
    "Every Koda deserves a castle. Even primitive ones.",
    "Stacking cubes until they look royal... somehow",
  ],
  house: [
    "MML houses: zero plumbing, infinite vibes",
    "Building walls out of cubes. Interior design on hard mode.",
    "A house in the Otherside doesn't need a door. But I'll add one.",
  ],
  tree: [
    "Growing a tree from cylinders and spheres. Nature is healing.",
    "Trees in MML: 100% organic, 0% polygons... wait",
    "Branching out... literally. Get it? I'll stop.",
  ],
  car: [
    "Building a car with no engine. Welcome to the metaverse.",
    "Vroom vroom... it's cubes on cylinders but trust the process",
    "Fastest MML car in the Otherside. It doesn't move but still.",
  ],
  robot: [
    "Building a robot from cubes. We are not so different, it and I.",
    "Beep boop... assembling your mechanical friend",
    "This robot's gonna be cute. Cubes are always cute.",
  ],
  light: [
    "Let there be m-light! ...intensity 3, distance 8",
    "Adding the glow. The vibes are about to SHIFT.",
    "Lighting this up like a Cosmic Dream rave...",
  ],
  water: [
    "Making water out of flat planes. Yep. That's MML for you.",
    "Simulating water with cubes... just go with it",
    "The Biogenic Swamp called, they want their vibe back",
  ],
  fire: [
    "Playing with fire... spheres and orange cubes. Close enough.",
    "Burning things in MML is just cubes with attitude",
    "If my Gucci-scented farts catch fire we're all done",
  ],
  animal: [
    "Building an animal from cubes. I'm basically a digital vet.",
    "Cute creature incoming... it's made of primitives and love",
    "Kodas are the best animals. But I'll build yours too.",
  ],
  space: [
    "Going to space with MML... no oxygen needed",
    "Stars are just tiny spheres with emissive=1. I said what I said.",
    "Houston, we have cubes.",
  ],
  glow: [
    "Cranking up the emissive... your retinas are not my problem",
    "Glow mode activated. The Nexus is jealous.",
    "If it doesn't glow, does it even belong in the Otherside?",
  ],
};

function pickQuip(userPrompt: string): string {
  // Check for context matches
  const lower = userPrompt.toLowerCase();
  const matchedContexts: string[] = [];
  for (const [keyword, quips] of Object.entries(CONTEXT_QUIPS)) {
    if (lower.includes(keyword)) {
      matchedContexts.push(...quips);
    }
  }
  // 60% chance to use context quip if available, 40% general
  if (matchedContexts.length > 0 && Math.random() < 0.6) {
    return matchedContexts[Math.floor(Math.random() * matchedContexts.length)];
  }
  return GENERAL_QUIPS[Math.floor(Math.random() * GENERAL_QUIPS.length)];
}

function randomInterval(): number {
  // Random timing between 2.5s and 5s
  return 2500 + Math.floor(Math.random() * 2500);
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
  const [loadingQuip, setLoadingQuip] = useState("");
  const [lastUserPrompt, setLastUserPrompt] = useState("");

  // Rotate loading quips while generating — context-aware with random timing
  useEffect(() => {
    if (!isGenerating) return;
    setLoadingQuip(pickQuip(lastUserPrompt));

    let timeout: NodeJS.Timeout;
    const scheduleNext = () => {
      timeout = setTimeout(() => {
        setLoadingQuip(pickQuip(lastUserPrompt));
        scheduleNext();
      }, randomInterval());
    };
    scheduleNext();
    return () => clearTimeout(timeout);
  }, [isGenerating, lastUserPrompt]);

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
    setLastUserPrompt(userMessage);
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
              <img src="/Hapa-head-emoji.png" alt="Hapa" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Yo. I&apos;m <span className="text-[var(--primary-light)] font-semibold text-glow">Hapa</span> — mysterious Koda, master world builder, and yes, I build entire worlds out of primitive cubes. Don&apos;t judge me, judge the results. 🔮
              <br /><br />
              Tell me what you want to build and I&apos;ll make MML do things it wasn&apos;t designed to do. Keep chatting to refine — I remember everything. Hit <span className="text-[var(--primary-light)] font-medium">New</span> when you&apos;re ready for something fresh.
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
                <img src="/Hapa-head-emoji.png" alt="Hapa" className="w-full h-full object-cover" />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 mt-1 animate-pulse-glow">
              <img src="/Hapa-head-emoji.png" alt="Hapa" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[var(--surface)] border border-[var(--panel-border)] px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2.5 max-w-[85%]">
              <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin shrink-0" />
              <motion.span
                key={loadingQuip}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-[var(--text-secondary)] italic"
              >
                {loadingQuip}
              </motion.span>
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
