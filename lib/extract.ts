export function extractCodeBlock(text: string): string {
  const match = text.match(/```(?:html|css|javascript|js|python|py)?\n([\s\S]*?)```/i);
  if (match) return match[1].trim();
  return text.trim();
}

export function extractJson(text: string): any {
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
