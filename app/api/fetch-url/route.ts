import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "url wajib diisi" }), { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (StudioMultiAgent/1.0)" },
    });
    const html = await res.text();
    const trimmed = html.slice(0, 20000);
    return Response.json({ ok: true, status: res.status, html: trimmed });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
