"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const suggestions = [
  "How many requests are pending?",
  "What's the oldest open request?",
  "What's our duplicate rate?",
  "Anything overdue on SLA?",
  "Spend by category?",
  "What's our data quality score?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "I'm the Steward Copilot — I answer grounded in the live request queue and material master, not canned text. Ask me about the pipeline, SLA risk, spend, or why a specific match was flagged.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, sessionId: "demo" }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  return (
    <div className="max-w-[760px] flex flex-col h-[calc(100vh-140px)]">
      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--line)" }}>
          <Sparkles size={15} style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-semibold">Steward Copilot</span>
          <span className="pill pill-neutral ml-auto">Grounded in live DB · no canned answers</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[80%] rounded-xl px-4 py-2.5 text-[13px] whitespace-pre-wrap"
                style={{
                  background: m.role === "user" ? "var(--accent)" : "var(--surface-2)",
                  color: m.role === "user" ? "#fff" : "var(--ink)",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--muted)" }}>
              <Loader2 size={13} className="animate-spin" /> thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t" style={{ borderColor: "var(--line)" }}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="text-[11px] px-2.5 py-1 rounded-full border" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about the queue, duplicates, spend, SLA…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button className="btn btn-primary" onClick={() => send()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
