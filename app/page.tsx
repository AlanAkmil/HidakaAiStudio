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

  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "100vh", maxWidth: 720, margin: "0 auto" }}>
      <header style={{ padding: "16px 16px 8px", borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ fontSize: 16, margin: 0, color: "var(--accent)" }}>&gt; studio_</h1>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
          10 agent (gemini / openrouter / groq) — coding pipeline
        </p>
      </header>

      <div className="scrollbar-thin" style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {messages.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            &gt; contoh: &quot;buatkan landing page toko kopi, gaya minimal&quot; atau &quot;scrape harga produk
            dari url X, tampilkan tabel&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 8,
              padding: "6px 10px",
              maxWidth: "88%",
              marginLeft: m.role === "user" ? "auto" : 0,
              background: m.role === "user" ? "var(--accent)" : "var(--panel)",
              color: m.role === "user" ? "#02150a" : "var(--text)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              fontSize: 12.5,
            }}
          >
            {m.role === "user" ? "> " : ""}
            {m.text}
          </div>
        ))}

        <div style={{ display: "flex", gap: 4, marginTop: 16, borderBottom: "1px solid var(--border)" }}>
          {(["workbench", "code", "preview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === t ? "var(--text)" : "var(--text-muted)",
                padding: "6px 4px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              [{t}]
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <ZipDownload files={Object.fromEntries(files.map((f) => [f.filename, f.content]))} />
          </div>
        </div>

        <div style={{ paddingTop: 12 }}>
          {tab === "workbench" && <AgentTimeline items={timeline} />}
          {tab === "code" && <CodeViewer files={files} />}
          {tab === "preview" && <PreviewFrame html={finalHtml} />}
        </div>

        {pythonSnippet && (
          <div style={{ marginTop: 16 }}>
            <PythonRunner code={pythonSnippet} />
          </div>
        )}
      </div>

      <footer style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="ketik brief project..."
          style={{
            flex: 1,
            background: "var(--panel-raised)",
            border: "1px solid var(--border)",
            padding: "9px 10px",
            color: "var(--text)",
            fontSize: 13,
          }}
        />
        <button
          onClick={send}
          disabled={busy}
          style={{
            background: busy ? "var(--panel-raised)" : "var(--accent)",
            color: busy ? "var(--text-muted)" : "#02150a",
            border: "1px solid var(--border)",
            padding: "9px 14px",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {busy ? "..." : "run"}
        </button>
      </footer>
    </main>
  );
}
