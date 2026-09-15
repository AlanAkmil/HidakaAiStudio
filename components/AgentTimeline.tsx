"use client";

import { AGENTS } from "../lib/agents";

export type TimelineItem = {
  agent: string;
  label: string;
  status: "running" | "done" | "error";
  summary?: string;
};

const PROVIDER_TAG: Record<string, string> = {
  gemini: "GEMINI",
  openrouter: "OPENROUTER",
  groq: "GROQ",
};

export default function AgentTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        &gt; belum ada proses berjalan. kirim brief di bawah untuk mulai.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => {
        const agent = AGENTS[item.agent];
        const dotColor =
          item.status === "running" ? "var(--accent)" : item.status === "done" ? "var(--accent)" : "var(--error)";
        const symbol = item.status === "running" ? "▸" : item.status === "done" ? "✓" : "✕";
        return (
          <li
            key={i}
            style={{
              border: "1px solid var(--border)",
              background: "var(--panel-raised)",
              padding: "8px 10px",
              fontSize: 12.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: dotColor, width: 12 }}>{symbol}</span>
              <strong>{agent?.name ?? item.agent}</strong>
              {agent && (
                <span style={{ color: "var(--text-muted)", fontSize: 10, border: "1px solid var(--border)", padding: "0 4px" }}>
                  {PROVIDER_TAG[agent.provider]}
                </span>
              )}
              <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{item.status}</span>
            </div>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{item.label}</p>
            {item.summary && <p style={{ margin: "4px 0 0" }}>{item.summary}</p>}
          </li>
        );
      })}
    </ul>
  );
}
