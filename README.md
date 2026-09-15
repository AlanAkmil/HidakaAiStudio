# Studio — Multi-Agent Coding Chat (v2, no path-alias)

Fungsi & agent-nya sama kayak versi sebelumnya (10 agent: router, architect,
UI/UX + anti-slop reviewer, CSS, JS, scraper, QA, security, assembler — model
AI-nya juga sama, semua free tier). Yang beda: **semua import pakai path
relative (`../lib/...`), bukan alias `@/...`**, dan `tsconfig.json` disederhanakan
tanpa `paths`. Ini buat ngilangin kemungkinan penyebab error kemarin
("Module not found: Can't resolve '@/components/...'" padahal file-nya ada) —
kemungkinan besar `tsconfig.json` yang di-upload sempat rusak/gak valid pas
proses upload, jadi alias-nya gak ke-resolve. Dengan relative import, resiko
itu hilang sama sekali karena gak nyandar ke konfigurasi apa pun. UI juga
diganti (tema terminal/CRT hijau) biar keliatan beda dari versi sebelumnya.

## Cara deploy

1. **Buat repo GitHub baru** (jangan pakai/reuse repo lama biar bersih dari
   histori commit yang berantakan).
2. Upload semua file di project ini pakai tool zip-to-GitHub yang lu punya,
   jaga struktur folder (`app/`, `lib/`, `components/`) tetap seperti aslinya.
3. Import repo itu ke Vercel → Deploy (Next.js auto-detect).
4. Isi 3 environment variable di Vercel (Settings > Environment Variables):
   - `GEMINI_API_KEY`
   - `OPENROUTER_API_KEY`
   - `GROQ_API_KEY`
5. Redeploy setelah env var diisi.

## Kalau masih gagal build

Screenshot log build-nya dan cek baris "Cloning ... Commit: xxxxx" — pastikan
hash commit itu SAMA dengan commit terbaru di GitHub. Kalau beda, itu bukan
masalah kode, tapi Vercel belum narik commit terbaru (cek Settings > Git di
Vercel, pastikan Production Branch = `main` dan repo yang ter-connect benar).

## Model AI (tidak diubah dari versi sebelumnya)

Router: Groq `openai/gpt-oss-20b` · Architect: OpenRouter
`nvidia/nemotron-3-ultra-550b-a55b:free` · UI/UX & Anti-Slop: Gemini
`gemini-2.5-flash` · CSS: OpenRouter `poolside/laguna-s-2.1:free` · JS &
Assembler: Groq `openai/gpt-oss-120b` · Scraper: Groq `groq/compound` · QA:
OpenRouter `nex-agi/nex-n2.5-pro:free` · Security: OpenRouter
`cohere/north-mini-code:free`.
