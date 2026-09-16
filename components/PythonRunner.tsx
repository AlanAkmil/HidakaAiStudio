"use client";

import { useState } from "react";

declare global {
  interface Window {
    loadPyodide?: (opts?: any) => Promise<any>;
  }
}

let pyodideInstance: any = null;

async function ensurePyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Gagal load Pyodide"));
      document.body.appendChild(script);
    });
  }
  pyodideInstance = await window.loadPyodide!();
  return pyodideInstance;
}

export default function PythonRunner({ code }: { code: string }) {
  const [output, setOutput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");

  async function run() {
    try {
      setStatus("loading");
      const pyodide = await ensurePyodide();
      setStatus("running");
      let captured = "";
      pyodide.setStdout({ batched: (s: string) => (captured += s + "\n") });
      await pyodide.runPythonAsync(code);
      setOutput(captured || "(tidak ada output)");
      setStatus("done");
    } catch (e: any) {
      setOutput(e.message ?? String(e));
      setStatus("error");
    }
  }

  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--panel-raised)", padding: 8, fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--text-muted)" }}>$ run python</span>
        <button
          onClick={run}
          disabled={status === "loading" || status === "running"}
          style={{
            marginLeft: "auto",
            background: "var(--accent)",
            border: "none",
            padding: "3px 8px",
            fontSize: 11,
            fontWeight: 600,
            color: "#2a1509",
          }}
        >
          {status === "loading" ? "loading..." : status === "running" ? "running..." : "run"}
        </button>
      </div>
      {output && (
        <pre className="scrollbar-thin" style={{ marginTop: 8, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
          {output}
        </pre>
      )}
    </div>
  );
}
