import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listMessages,
  addMessage,
  updateChatConversationId,
  renameChat,
  type Chat,
  type ChatMessage,
} from "../lib/supabase";
import { buildBundledPrompt, streamDify } from "../lib/difyService";

export default function ChatView({ chat }: { chat: Chat }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(chat.dify_conversation_id ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(chat.dify_conversation_id ?? "");
    listMessages(chat.id).then(setMessages).catch(console.error);
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const userMsg = await addMessage(chat.id, user.id, "user", text);
    setMessages((m) => [...m, userMsg]);

    const placeholderId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: placeholderId, chat_id: chat.id, user_id: user.id, role: "assistant", content: "", created_at: new Date().toISOString() },
    ]);

    try {
      const bundled = buildBundledPrompt(text, "", []);
      let acc = "";
      const { conversationId: newConvId } = await streamDify(bundled, conversationId, user.id, (chunk) => {
        acc += chunk;
        setMessages((m) => m.map((msg) => (msg.id === placeholderId ? { ...msg, content: acc } : msg)));
      });

      setConversationId(newConvId);
      await updateChatConversationId(chat.id, newConvId);
      await addMessage(chat.id, user.id, "assistant", acc);

      if (chat.title === "New chat") {
        const shortTitle = text.slice(0, 40) + (text.length > 40 ? "…" : "");
        await renameChat(chat.id, shortTitle);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => m.map((message) => (message.id === placeholderId ? { ...message, content: msg } : message)));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-8 py-4 dark:border-border-dark">
        <h2 className="font-display text-lg text-ink dark:text-ink-dark">{chat.title}</h2>
      </div>

      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-8 py-6">
        {messages.length === 0 && (
          <p className="text-sm text-muted dark:text-muted-dark">
            Brainstorm, outline, or generate — this thread has no project style attached. For a persistent voice
            and reference documents, use a Project instead.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-2xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-plum text-paper"
                  : "border border-line bg-white text-ink dark:border-border-dark dark:bg-surface-raised dark:text-ink-dark"
              }`}
            >
              {m.content || (sending ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line px-8 py-4 dark:border-border-dark">
        <div className="flex items-end gap-3 rounded-2xl border border-line bg-white p-2 dark:border-border-dark dark:bg-surface-raised">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Message Pelo…"
            className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 dark:text-ink-dark dark:placeholder:text-muted-dark/70"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-plum px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-plum-dark disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
