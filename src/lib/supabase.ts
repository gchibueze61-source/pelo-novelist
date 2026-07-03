import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error("Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(url, anonKey);

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  dify_conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  dify_conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AttachedDoc = { name: string; text: string };

export type ProjectContext = {
  id: string;
  project_id: string;
  user_id: string;
  style_instructions: string;
  attached_documents: AttachedDoc[];
  updated_at: string;
};

export async function getOrCreateProfile(userId: string, email: string, name?: string): Promise<Profile> {
  const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (existing) return existing as Profile;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email, name: name ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return created as Profile;
}

// ---------- Chats ----------

export async function listChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Chat[];
}

export async function createChat(userId: string, title = "New chat"): Promise<Chat> {
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, title })
    .select("*")
    .single();
  if (error) throw error;
  return data as Chat;
}

export async function deleteChat(chatId: string): Promise<void> {
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export async function renameChat(chatId: string, title: string): Promise<void> {
  const { error } = await supabase.from("chats").update({ title, updated_at: new Date().toISOString() }).eq("id", chatId);
  if (error) throw error;
}

export async function updateChatConversationId(chatId: string, difyConversationId: string): Promise<void> {
  const { error } = await supabase
    .from("chats")
    .update({ dify_conversation_id: difyConversationId, updated_at: new Date().toISOString() })
    .eq("id", chatId);
  if (error) throw error;
}

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as ChatMessage[];
}

export async function addMessage(
  chatId: string,
  userId: string,
  role: ChatMessage["role"],
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ chat_id: chatId, user_id: userId, role, content })
    .select("*")
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

// ---------- Projects ----------

export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function createProject(userId: string, name: string, description = ""): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name, description })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("project_context").insert({
    project_id: data.id,
    user_id: userId,
    style_instructions: "",
    attached_documents: [],
  });

  return data as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function updateProjectConversationId(projectId: string, difyConversationId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ dify_conversation_id: difyConversationId, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw error;
}

// ---------- Chapters ----------

export async function listChapters(projectId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return data as Chapter[];
}

export async function createChapter(projectId: string, userId: string, title: string, order: number): Promise<Chapter> {
  const { data, error } = await supabase
    .from("chapters")
    .insert({ project_id: projectId, user_id: userId, title, content: "", display_order: order })
    .select("*")
    .single();
  if (error) throw error;
  return data as Chapter;
}

export async function updateChapter(chapterId: string, fields: Partial<Pick<Chapter, "title" | "content">>): Promise<void> {
  const { error } = await supabase
    .from("chapters")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", chapterId);
  if (error) throw error;
}

export async function deleteChapter(chapterId: string): Promise<void> {
  const { error } = await supabase.from("chapters").delete().eq("id", chapterId);
  if (error) throw error;
}

// ---------- Project context (style profile + attached docs) ----------

export async function getProjectContext(projectId: string): Promise<ProjectContext | null> {
  const { data, error } = await supabase
    .from("project_context")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectContext | null;
}

export async function updateStyleInstructions(projectId: string, styleInstructions: string): Promise<void> {
  const { error } = await supabase
    .from("project_context")
    .update({ style_instructions: styleInstructions, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) throw error;
}

export async function addAttachedDocument(projectId: string, doc: AttachedDoc): Promise<AttachedDoc[]> {
  const existing = await getProjectContext(projectId);
  const docs = [...(existing?.attached_documents ?? []), doc];
  const { error } = await supabase
    .from("project_context")
    .update({ attached_documents: docs, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) throw error;
  return docs;
}

export async function removeAttachedDocument(projectId: string, docName: string): Promise<AttachedDoc[]> {
  const existing = await getProjectContext(projectId);
  const docs = (existing?.attached_documents ?? []).filter((d) => d.name !== docName);
  const { error } = await supabase
    .from("project_context")
    .update({ attached_documents: docs, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) throw error;
  return docs;
}
