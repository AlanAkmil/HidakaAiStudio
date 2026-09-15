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
    <div style={{ minHeight: "100vh", padding: "20px 12px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          boxShadow: "0 0 60px rgba(57,255,136,0.06), 0 0 0 1px rgba(57,255,136,0.02)",
        }}
      >
        {/* title bar — kasih frame biar keliatan "jendela", bukan halaman kosong */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel-raised)",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff6b6b" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#f5c56b" }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>
            studio — multi-agent coding pipeline
          </span>
        </div>

        <div style={{ padding: 16 }}>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: "var(--text-muted)" }}>
            10 agent (gemini / openrouter / groq) — router → architect → ui/ux ⇄ anti-slop → css → js →
            scraper → qa → security → assembler
          </p>

          {/* chat log — dibatasi tinggi & dibingkai, bukan flex kosong sepanjang viewport */}
          <div
            className="scrollbar-thin"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
              minHeight: 90,
              maxHeight: "42vh",
              overflow: "auto",
              padding: 12,
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                &gt; contoh: &quot;buatkan landing page toko kopi, gaya minimal&quot; atau &quot;scrape harga
                produk dari url X, tampilkan tabel&quot;
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
                  background: m.role === "user" ? "var(--accent)" : "var(--panel-raised)",
                  color: m.role === "user" ? "#02150a" : "var(--text)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)",
                  fontSize: 12.5,
                }}
              >
                {m.role === "user" ? "> " : ""}
                {m.text}
              </div>
            ))}
          </div>

          {/* input — nempel langsung di bawah chat log, gak nunggu didorong flex 100vh */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
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
                padding: "9px 16px",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {busy ? "..." : "run"}
            </button>
          </div>

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

          {/* isi tab — dibingkai juga biar konsisten sama chat log di atas */}
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
              padding: 14,
              marginTop: 12,
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

          <p style={{ margin: "16px 0 0", fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
            gemini · openrouter · groq — api key aman di server, gak pernah ke browser
          </p>
        </div>
      </div>
    </div>
  );
}
