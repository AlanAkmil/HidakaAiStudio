// Semua request AI provider jalan di server (API routes), API key tidak pernah
// dikirim ke browser.

type CallResult = { text: string; raw?: unknown };

/**
 * Gemini — REST generateContent
 * Docs: https://ai.google.dev/api  (endpoint: /v1beta/models/{model}:generateContent)
 */
export async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<CallResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diset di environment variables");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.4 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  return { text, raw: data };
}

/**
 * OpenRouter — OpenAI-compatible chat completions
 * Docs: https://openrouter.ai/docs
 */
export async function callOpenRouter(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<CallResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY belum diset di environment variables");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text, raw: data };
}

/**
 * Groq — OpenAI-compatible chat completions
 * Docs: https://console.groq.com/docs
 */
export async function callGroq(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<CallResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY belum diset di environment variables");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { text, raw: data };
}

export async function callAgentProvider(
  provider: "gemini" | "openrouter" | "groq",
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<CallResult> {
  if (provider === "gemini") return callGemini(model, systemPrompt, userPrompt);
  if (provider === "openrouter") return callOpenRouter(model, systemPrompt, userPrompt);
  return callGroq(model, systemPrompt, userPrompt);
}
