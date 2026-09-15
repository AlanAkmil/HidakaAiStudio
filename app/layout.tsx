import "./globals.css";

export const metadata = {
  title: "Studio — Multi-Agent Coding Chat",
  description: "10 AI agent spesialis bikin web/scraper bareng, real-time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
