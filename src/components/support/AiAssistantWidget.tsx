import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, RotateCcw, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import logo from "@/assets/velocita-logo.png";
import { BRAND } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type Lang = "en" | "bn";

const COPY = {
  en: {
    title: "Personal Assistant",
    subtitle: `${BRAND.name} · online`,
    placeholder: "Ask about products, orders, checkout…",
    end: "End Chat",
    thinking: "Typing…",
    error: "Something went wrong. Please try again.",
    starter: "Hi! I am your personal assistant. How may I help you?",
  },
  bn: {
    title: "ব্যক্তিগত সহকারী",
    subtitle: `${BRAND.name} · অনলাইন`,
    placeholder: "পণ্য, অর্ডার বা চেকআউট নিয়ে জিজ্ঞাসা করুন…",
    end: "চ্যাট শেষ করুন",
    thinking: "লিখছে…",
    error: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
    starter: "হ্যালো! আমি আপনার ব্যক্তিগত সহকারী। কীভাবে সাহায্য করতে পারি?",
  },
} as const;

function Avatar() {
  return (
    <img
      src={logo}
      alt={`${BRAND.name} assistant`}
      className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
    />
  );
}

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Lang | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <>
      {open ? (
        <div className="animate-support-panel-in mb-1 flex h-[min(30rem,calc(100vh-9rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-surface/95 shadow-2xl backdrop-blur-xl">
          <ChatSession
            key={sessionKey}
            language={language}
            onPickLanguage={setLanguage}
            onClose={() => setOpen(false)}
            onEnd={() => {
              setLanguage(null);
              setSessionKey((k) => k + 1);
            }}
          />
        </div>
      ) : null}

      <div className="relative">
        {!open ? (
          <span className="animate-support-ping pointer-events-none absolute inset-0 rounded-full bg-primary/30" />
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          className={cn(
            "relative flex items-center gap-2 rounded-full bg-surface px-4 py-3 text-foreground shadow-xl",
            "border border-border/70 transition-colors hover:bg-surface-2",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            !open && "animate-lux-glow",
          )}
        >
          {open ? <X className="size-5" /> : <Bot className="size-5" />}
          <span className="text-[0.7rem] font-semibold tracking-[0.22em] uppercase">AI Chat</span>
        </button>
      </div>
    </>
  );
}

function ChatSession({
  language,
  onPickLanguage,
  onClose,
  onEnd,
}: {
  language: Lang | null;
  onPickLanguage: (l: Lang) => void;
  onClose: () => void;
  onEnd: () => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const copy = COPY[language ?? "en"];

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { language: language ?? "en" },
      }),
    [language],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (language) inputRef.current?.focus();
  }, [language, status]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border/60 bg-surface-2/70 px-4 py-3">
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-sm tracking-tight">{copy.title}</p>
          <p className="truncate text-[0.7rem] text-muted-foreground">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onEnd}
          title={copy.end}
          className="flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-[0.65rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          {copy.end}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        <div className="flex items-end gap-2">
          <Avatar />
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-sm leading-relaxed">
            Hi! I am your personal assistant. How may I help you?
          </div>
        </div>

        {!language ? (
          <div className="flex flex-wrap gap-2 pl-9">
            <button
              type="button"
              onClick={() => onPickLanguage("en")}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onPickLanguage("bn")}
              className="rounded-full border border-primary/60 px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              বাংলা
            </button>
          </div>
        ) : null}

        {messages.map((message) => {
          const text = message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("");
          if (!text) return null;
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground">
                  {text}
                </div>
              </div>
            );
          }
          return (
            <div key={message.id} className="flex items-end gap-2">
              <Avatar />
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                {text}
              </div>
            </div>
          );
        })}

        {busy ? (
          <div className="flex items-end gap-2">
            <Avatar />
            <div className="rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-xs text-muted-foreground">
              {copy.thinking}
            </div>
          </div>
        ) : null}

        {error ? <p className="pl-9 text-xs text-destructive">{copy.error}</p> : null}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = input.trim();
          if (!value || !language || busy) return;
          setInput("");
          void sendMessage({ text: value });
        }}
        className="flex items-center gap-2 border-t border-border/60 bg-surface-2/60 px-3 py-2.5"
      >
        <input
          ref={inputRef}
          value={input}
          disabled={!language}
          onChange={(event) => setInput(event.target.value)}
          placeholder={language ? copy.placeholder : "Select a language to start"}
          className="focus-visible:ring-ring min-w-0 flex-1 rounded-full border border-border/70 bg-background px-3.5 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!language || busy || !input.trim()}
          aria-label="Send message"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </>
  );
}
