import type { AttachedDoc } from "./supabase";

const DIFY_URL = (import.meta.env.VITE_DIFY_API_URL as string) || "https://api.dify.ai/v1";
const DIFY_KEY = import.meta.env.VITE_DIFY_API_KEY as string;

export type DifyStreamResult = { conversationId: string };

/**
 * Builds the final message sent to Dify: the user's raw prompt, prefixed with
 * the project's style/tone instructions and the full text of any attached
 * reference documents. This is what makes a Project "remember" its voice —
 * Dify itself is stateless about style, so we inject it on every call.
 */
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

/**
 * Streams a response from Dify. onChunk fires as text arrives.
 * Pass the conversationId you got back last time to keep continuity;
 * leave blank to start a new thread.
 */
export async function streamDify(
  bundledMessage: string,
  conversationId: string,
  userId: string,
  onChunk: (text: string) => void
): Promise<DifyStreamResult> {
  if (!DIFY_KEY) {
    throw new Error("Missing VITE_DIFY_API_KEY in .env — paste your Dify app's API key there.");
  }

  const res = await fetch(`${DIFY_URL}/chat-messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIFY_KEY}`,
    },
    body: JSON.stringify({
      inputs: {},
      query: bundledMessage,
      response_mode: "streaming",
      conversation_id: conversationId || undefined,
      user: userId,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dify request failed (${res.status}): ${text || "check your VITE_DIFY_API_URL and key"}`);
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
        // partial chunk still arriving, wait for more
      }
    }
  }

  return { conversationId: newConversationId };
}

/**
 * Extracts readable text from an uploaded file for use as project context.
 * .txt / .md are read directly. Other types (PDF, DOCX) are stored by name
 * only for now — paste key excerpts into the style profile instead until
 * a parser is added.
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; supported: boolean }> {
  const readableTypes = [".txt", ".md"];
  const isReadable = readableTypes.some((ext) => file.name.toLowerCase().endsWith(ext));

  if (!isReadable) {
    return { text: "", supported: false };
  }

  const text = await file.text();
  return { text, supported: true };
}
