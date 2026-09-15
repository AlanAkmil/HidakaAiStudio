"use client";

export default function PreviewFrame({ html }: { html: string }) {
  if (!html) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>&gt; preview muncul setelah selesai.</p>;
  }
  return (
    <iframe
      title="preview"
      srcDoc={html}
      sandbox="allow-scripts allow-forms"
      style={{
        width: "100%",
        height: 420,
        border: "1px solid var(--border)",
        background: "#fff",
      }}
    />
  );
}
