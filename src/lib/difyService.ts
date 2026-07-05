import type { AttachedDoc } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type DifyStreamResult = { conversationId: string };

export function buildBundledPrompt(userPrompt: string, styleInstructions: string, attachedDocs: AttachedDoc[]): string {
  const parts: string[] = [];

  if (styleInstructions.trim()) {
    parts.push(`[STYLE PROFILE — follow these instructions for every response in this project]\n${styleInstructions.trim()}`);
  }

  if (attachedDocs.length > 0) {
    const docsBlock = attachedDocs
      .map((d) => `--- ${d.name} ---\n${d.text}`)
      .join("\n\n");
    parts.push(`[REFERENCE DOCUMENTS — use as background context]\n${docsBlock}`);
  }

  parts.push(`[REQUEST]\n${userPrompt}`);

  return parts.join("\n\n");
}

export async function streamDify(
  bundledMessage: string,
  conversationId: string,
  userId: string,
  onChunk: (text: string) => void
): Promise<DifyStreamResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/dify-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: bundledMessage,
      conversation_id: conversationId || undefined,
      user: userId,
    }),
  });

  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
      // response wasn't JSON
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let newConversationId = conversationId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const event = JSON.parse(jsonStr);
        if (event.event === "message" && event.answer) onChunk(event.answer);
        if (event.conversation_id) newConversationId = event.conversation_id;
      } catch {
        // partial chunk still arriving
      }
    }
  }

  return { conversationId: newConversationId };
}

export async function extractTextFromFile(file: File): Promise<{ text: string; supported: boolean }> {
  const readableTypes = [".txt", ".md"];
  const isReadable = readableTypes.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!isReadable) {
    return { text: "", supported: false };
  }

  const text = await file.text();
  return { text, supported: true };
}
