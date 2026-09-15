import { NextRequest } from "next/server";
import { AGENTS, AgentDef } from "../../../lib/agents";
import { callAgentProvider } from "../../../lib/providers";
import { extractCodeBlock, extractJson } from "../../../lib/extract";

export const maxDuration = 300;

type Event =
  | { type: "thinking"; agent: string; text: string }
  | { type: "tool_call"; agent: string; label: string; status: "running" | "done" | "error" }
  | { type: "summary"; agent: string; text: string }
  | { type: "code"; filename: string; content: string; language: string }
  | { type: "final"; files: Record<string, string> }
  | { type: "error"; message: string };

function sseLine(event: Event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function runAgent(agent: AgentDef, prompt: string) {
  const { text } = await callAgentProvider(agent.provider, agent.model, agent.systemPrompt, prompt);
  return text;
}

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(new TextEncoder().encode(sseLine(e)));

      try {
        send({ type: "tool_call", agent: "router", label: "Menyusun rencana kerja", status: "running" });
        const routerRaw = await runAgent(AGENTS.router, message);
        const plan = extractJson(routerRaw) ?? {
          task_type: "webapp",
          summary: message,
          needs_scrape: false,
          scrape_url: null,
          steps: ["architect", "ui_ux", "anti_slop", "css", "js", "qa", "security", "assembler"],
        };
        send({ type: "tool_call", agent: "router", label: "Menyusun rencana kerja", status: "done" });
        send({ type: "summary", agent: "router", text: `Rencana: ${plan.summary}` });

        let scrapedContent = "";
        if (plan.needs_scrape && plan.scrape_url) {
          send({ type: "tool_call", agent: "scraper", label: `Fetch ${plan.scrape_url}`, status: "running" });
          try {
            const origin = req.nextUrl.origin;
            const res = await fetch(`${origin}/api/fetch-url`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: plan.scrape_url }),
            });
            const data = await res.json();
            scrapedContent = data.html ?? "";
            send({ type: "tool_call", agent: "scraper", label: `Fetch ${plan.scrape_url}`, status: "done" });
          } catch {
            send({ type: "tool_call", agent: "scraper", label: `Fetch ${plan.scrape_url}`, status: "error" });
          }
        }

        const context = { brief: message, plan, scrapedContent };
        let architectOutline = "";
        let htmlDraft = "";
        let cssDraft = "";
        let jsDraft = "";

        if (plan.steps.includes("architect")) {
          send({ type: "tool_call", agent: "architect", label: "Merancang struktur", status: "running" });
          architectOutline = await runAgent(AGENTS.architect, JSON.stringify(context));
          send({ type: "tool_call", agent: "architect", label: "Merancang struktur", status: "done" });
          send({ type: "summary", agent: "architect", text: architectOutline.slice(0, 400) });
        }

        if (plan.steps.includes("ui_ux")) {
          send({ type: "tool_call", agent: "ui_ux", label: "Membuat markup & layout", status: "running" });
          htmlDraft = extractCodeBlock(
            await runAgent(AGENTS.ui_ux, `Brief: ${message}\n\nOutline arsitektur:\n${architectOutline}`)
          );
          send({ type: "tool_call", agent: "ui_ux", label: "Membuat markup & layout", status: "done" });

          for (let i = 0; i < 2; i++) {
            send({ type: "tool_call", agent: "anti_slop", label: "Cek AI-slop", status: "running" });
            const reviewRaw = await runAgent(AGENTS.anti_slop, htmlDraft);
            const review = extractJson(reviewRaw);
            send({ type: "tool_call", agent: "anti_slop", label: "Cek AI-slop", status: "done" });

            if (!review || !review.is_slop) {
              send({ type: "summary", agent: "anti_slop", text: "Lolos — desain tidak generic." });
              break;
            }
            send({
              type: "summary",
              agent: "anti_slop",
              text: `Kelihatan AI-slop: ${review.reasons?.join(", ")}. Minta revisi.`,
            });
            send({ type: "tool_call", agent: "ui_ux", label: "Revisi markup", status: "running" });
            htmlDraft = extractCodeBlock(
              await runAgent(
                AGENTS.ui_ux,
                `Markup sebelumnya:\n${htmlDraft}\n\nInstruksi revisi dari reviewer:\n${review.fix_instruction}`
              )
            );
            send({ type: "tool_call", agent: "ui_ux", label: "Revisi markup", status: "done" });
          }
          send({ type: "code", filename: "draft.html", content: htmlDraft, language: "html" });
        }

        if (plan.steps.includes("css")) {
          send({ type: "tool_call", agent: "css", label: "Menulis CSS", status: "running" });
          cssDraft = extractCodeBlock(
            await runAgent(AGENTS.css, `Markup:\n${htmlDraft}\n\nOutline desain:\n${architectOutline}`)
          );
          send({ type: "tool_call", agent: "css", label: "Menulis CSS", status: "done" });
          send({ type: "code", filename: "styles.css", content: cssDraft, language: "css" });
        }

        if (plan.steps.includes("js")) {
          send({ type: "tool_call", agent: "js", label: "Menulis JavaScript", status: "running" });
          jsDraft = extractCodeBlock(
            await runAgent(AGENTS.js, `Markup:\n${htmlDraft}\n\nBrief interaktivitas:\n${message}`)
          );
          send({ type: "tool_call", agent: "js", label: "Menulis JavaScript", status: "done" });
          send({ type: "code", filename: "script.js", content: jsDraft, language: "javascript" });
        }

        if (plan.needs_scrape) {
          send({ type: "tool_call", agent: "scraper", label: "Menulis logic parsing", status: "running" });
          const scraperCode = extractCodeBlock(
            await runAgent(
              AGENTS.scraper,
              `Konten mentah target:\n${scrapedContent.slice(0, 6000)}\n\nKebutuhan user:\n${message}`
            )
          );
          jsDraft += `\n\n// --- Scraper logic ---\n${scraperCode}`;
          send({ type: "tool_call", agent: "scraper", label: "Menulis logic parsing", status: "done" });
        }

        send({ type: "tool_call", agent: "assembler", label: "Menggabungkan file", status: "running" });
        const assembledRaw = await runAgent(
          AGENTS.assembler,
          `HTML:\n${htmlDraft}\n\nCSS:\n${cssDraft}\n\nJS:\n${jsDraft}`
        );
        let finalHtml = extractCodeBlock(assembledRaw);
        send({ type: "tool_call", agent: "assembler", label: "Menggabungkan file", status: "done" });

        if (plan.steps.includes("qa")) {
          send({ type: "tool_call", agent: "qa", label: "Cek bug", status: "running" });
          const qaRaw = await runAgent(AGENTS.qa, finalHtml);
          const qa = extractJson(qaRaw);
          send({ type: "tool_call", agent: "qa", label: "Cek bug", status: "done" });
          if (qa?.has_bugs) {
            send({ type: "summary", agent: "qa", text: `Bug ditemukan: ${qa.issues?.join(", ")}` });
            if (qa.fixed_code) finalHtml = extractCodeBlock(qa.fixed_code);
          } else {
            send({ type: "summary", agent: "qa", text: "Tidak ada bug signifikan." });
          }
        }

        if (plan.steps.includes("security")) {
          send({ type: "tool_call", agent: "security", label: "Cek keamanan", status: "running" });
          const secRaw = await runAgent(AGENTS.security, finalHtml);
          const sec = extractJson(secRaw);
          send({ type: "tool_call", agent: "security", label: "Cek keamanan", status: "done" });
          send({
            type: "summary",
            agent: "security",
            text: sec?.safe ? "Aman, tidak ada temuan kritikal." : `Temuan: ${sec?.findings?.join(", ")}`,
          });
        }

        send({ type: "code", filename: "index.html", content: finalHtml, language: "html" });
        send({ type: "final", files: { "index.html": finalHtml } });
      } catch (err: any) {
        send({ type: "error", message: err.message ?? String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
