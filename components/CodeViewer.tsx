"use client";

import { useState } from "react";

export type CodeFile = { filename: string; content: string; language: string };

export default function CodeViewer({ files }: { files: CodeFile[] }) {
  const [active, setActive] = useState(0);
  if (files.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>&gt; belum ada kode dihasilkan.</p>;
  }
  const file = files[active];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {files.map((f, i) => (
          <button
            key={f.filename + i}
            onClick={() => setActive(i)}
            style={{
              fontSize: 11.5,
              padding: "4px 8px",
              border: "1px solid var(--border)",
              background: i === active ? "var(--accent)" : "var(--panel-raised)",
              color: i === active ? "#2a1509" : "var(--text)",
            }}
          >
            {f.filename}
          </button>
        ))}
      </div>
      <pre
        className="scrollbar-thin"
        style={{
          background: "#1d1712",
          border: "1px solid var(--border)",
          padding: 10,
          fontSize: 11.5,
          lineHeight: 1.5,
          maxHeight: 360,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {file.content}
      </pre>
    </div>
  );
}
