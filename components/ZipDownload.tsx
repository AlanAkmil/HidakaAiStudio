"use client";

export default function ZipDownload({ files }: { files: Record<string, string> }) {
  const disabled = Object.keys(files).length === 0;

  async function handleDownload() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studio-output.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      style={{
        background: disabled ? "var(--panel-raised)" : "var(--accent)",
        color: disabled ? "var(--text-muted)" : "#02150a",
        border: "1px solid var(--border)",
        padding: "7px 14px",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      [ download.zip ]
    </button>
  );
}
