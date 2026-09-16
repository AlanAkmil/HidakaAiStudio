"use client";

import { useState } from "react";
import AgentTimeline, { TimelineItem } from "../components/AgentTimeline";
import CodeViewer, { CodeFile } from "../components/CodeViewer";
import PreviewFrame from "../components/PreviewFrame";
import ZipDownload from "../components/ZipDownload";
import PythonRunner from "../components/PythonRunner";

type ChatMsg = { role: "user" | "system"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [finalHtml, setFinalHtml] = useState("");
  const [pythonSnippet, setPythonSnippet] = useState("");
  const [tab, setTab] = useState<"workbench" | "preview" | "code">("workbench");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const brief = input.trim();
    setMessages((m) => [...m, { role: "user", text: brief }]);
    setInput("");
    setTimeline([]);
    setFiles([]);
    setFinalHtml("");
    setBusy(true);
    setTab("workbench");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: brief }),
    });

    if (!res.body) {
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const evt = JSON.parse(part.slice(6));
        handleEvent(evt);
      }
    }
    setBusy(false);
  }

  function handleEvent(evt: any) {
    if (evt.type === "tool_call") {
      setTimeline((t) => {
        const idx = t.findIndex((x) => x.agent === evt.agent && x.label === evt.label && x.status === "running");
        if (evt.status !== "running" && idx !== -1) {
          const copy = [...t];
          copy[idx] = { ...copy[idx], status: evt.status };
          return copy;
        }
        return [...t, { agent: evt.agent, label: evt.label, status: evt.status }];
      });
    } else if (evt.type === "summary") {
      setTimeline((t) => {
        const copy = [...t];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].agent === evt.agent) {
            copy[i] = { ...copy[i], summary: evt.text };
            break;
          }
        }
        return copy;
      });
      setMessages((m) => [...m, { role: "system", text: `[${evt.agent}] ${evt.text}` }]);
    } else if (evt.type === "code") {
      setFiles((f) => {
        const others = f.filter((x) => x.filename !== evt.filename);
        return [...others, { filename: evt.filename, content: evt.content, language: evt.language }];
      });
      if (evt.filename === "index.html") setFinalHtml(evt.content);
      if (evt.language === "python") setPythonSnippet(evt.content);
      setTab("code");
    } else if (evt.type === "final") {
      setTab("preview");
    } else if (evt.type === "error") {
      setMessages((m) => [...m, { role: "system", text: `error: ${evt.message}` }]);
    }
  }
  const started = messages.length > 0;

  const inputBar = (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 22,
        boxShadow: "0 8px 24px rgba(32,26,18,0.06)",
        padding: "14px 16px 10px",
      }}
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="Buatkan landing page untuk startup saya..."
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text)",
          fontSize: 15,
          padding: "4px 2px 10px",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 18 }}>+</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
          10 agents
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>groq · openrouter · gemini</span>
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          style={{
            marginLeft: "auto",
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "none",
            background: busy || !input.trim() ? "var(--border)" : "var(--accent)",
            color: "#fff",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Kirim"
        >
          {busy ? "⋯" : "↑"}
        </button>
      </div>
    </div>
  );

  if (!started) {
    // Layar awal — hero terpusat, mirip referensi
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(60% 40% at 50% 100%, rgba(217,119,87,0.16), transparent 70%), var(--bg)",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", padding: "18px 20px" }}>
          <strong style={{ fontSize: 15 }}>studio</strong>
          <span style={{ marginLeft: 6, fontSize: 13, color: "var(--text-muted)" }}>
            multi-agent coding
          </span>
        </header>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
          }}
        >
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 10px", letterSpacing: -1 }}>
            studio<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p style={{ fontSize: 19, fontWeight: 700, margin: "0 0 28px" }}>Mari membangun sesuatu.</p>

          <div style={{ width: "100%", maxWidth: 560 }}>
            {inputBar}
            <p style={{ marginTop: 10, fontSize: 12.5, color: "var(--text-muted)", textAlign: "center" }}>
              📎 lampirkan referensi, atau minta scrape sebuah URL
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Layar aktif — percakapan + workbench, input pindah ke bawah
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel)",
        }}
      >
        <strong style={{ fontSize: 14 }}>studio</strong>
        <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>
          router → architect → ui/ux ⇄ anti-slop → css → js → scraper → qa → security → assembler
        </span>
      </header>

      <div className="scrollbar-thin" style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 640, width: "100%", margin: "0 auto" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 10,
              padding: "9px 14px",
              borderRadius: 14,
              maxWidth: "85%",
              marginLeft: m.role === "user" ? "auto" : 0,
              background: m.role === "user" ? "var(--accent)" : "var(--panel)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              fontSize: 13.5,
            }}
          >
            {m.text}
          </div>
        ))}

        <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: "1px solid var(--border)" }}>
          {(["workbench", "code", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === t ? "var(--text)" : "var(--text-muted)",
                padding: "6px 8px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {t === "workbench" ? "Workbench" : t === "code" ? "Kode" : "Preview"}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <ZipDownload files={Object.fromEntries(files.map((f) => [f.filename, f.content]))} />
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--panel)",
            borderRadius: 12,
            padding: 16,
            marginTop: 14,
            minHeight: 120,
          }}
        >
          {tab === "workbench" && <AgentTimeline items={timeline} />}
          {tab === "code" && <CodeViewer files={files} />}
          {tab === "preview" && <PreviewFrame html={finalHtml} />}
        </div>

        {pythonSnippet && (
          <div style={{ marginTop: 14 }}>
            <PythonRunner code={pythonSnippet} />
          </div>
        )}
      </div>

      <div style={{ padding: "14px 20px 20px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>{inputBar}</div>
      </div>
    </div>
  );
}
