import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  listChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  getProjectContext,
  updateStyleInstructions,
  addAttachedDocument,
  removeAttachedDocument,
  updateProjectConversationId,
  type Project,
  type Chapter,
  type AttachedDoc,
} from "../lib/supabase";
import { buildBundledPrompt, streamDify, extractTextFromFile } from "../lib/difyService";

type SubTab = "chapters" | "style" | "files";

export default function ProjectView({ project }: { project: Project }) {
  const [subTab, setSubTab] = useState<SubTab>("chapters");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-8 py-4 dark:border-border-dark">
        <h2 className="font-display text-lg text-ink dark:text-ink-dark">{project.name}</h2>
        {project.description && <p className="text-sm text-muted dark:text-muted-dark">{project.description}</p>}
        <div className="mt-3 flex gap-1">
          {(["chapters", "style", "files"] as SubTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                subTab === t
                  ? "bg-plum text-paper"
                  : "text-muted hover:bg-line/50 dark:text-muted-dark dark:hover:bg-white/5"
              }`}
            >
              {t === "style" ? "Style Profile" : t === "files" ? "Reference Files" : "Chapters"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {subTab === "chapters" && <ChaptersPanel project={project} />}
        {subTab === "style" && <StylePanel project={project} />}
        {subTab === "files" && <FilesPanel project={project} />}
      </div>
    </div>
  );
}

// ---------------- Chapters ----------------

function ChaptersPanel({ project }: { project: Project }) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listChapters(project.id).then((c) => {
      setChapters(c);
      if (c.length > 0) selectChapter(c[0]);
    });
  }, [project.id]);

  function selectChapter(c: Chapter) {
    setActiveId(c.id);
    setTitle(c.title);
    setContent(c.content);
  }

  async function handleNewChapter() {
    if (!user) return;
    const c = await createChapter(project.id, user.id, `Chapter ${chapters.length + 1}`, chapters.length);
    setChapters((prev) => [...prev, c]);
    selectChapter(c);
  }

  async function handleDelete(id: string) {
    await deleteChapter(id);
    const remaining = chapters.filter((c) => c.id !== id);
    setChapters(remaining);
    if (activeId === id) {
      if (remaining.length > 0) selectChapter(remaining[0]);
      else {
        setActiveId(null);
        setContent("");
        setTitle("");
      }
    }
  }

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (!activeId) return;
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      updateChapter(activeId, { title: nextTitle, content: nextContent }).catch(console.error);
      setChapters((prev) => prev.map((c) => (c.id === activeId ? { ...c, title: nextTitle, content: nextContent } : c)));
    }, 600);
    setSaveTimer(t);
  }

  async function handleGenerate() {
    if (!user || !prompt.trim() || !activeId) return;
    setGenerating(true);

    try {
      const ctx = await getProjectContext(project.id);
      const bundled = buildBundledPrompt(prompt, ctx?.style_instructions ?? "", ctx?.attached_documents ?? []);
      let acc = content ? content + "\n\n" : "";

      const { conversationId } = await streamDify(bundled, project.dify_conversation_id ?? "", user.id, (chunk) => {
        acc += chunk;
        setContent(acc);
      });

      await updateProjectConversationId(project.id, conversationId);
      await updateChapter(activeId, { content: acc });
      setChapters((prev) => prev.map((c) => (c.id === activeId ? { ...c, content: acc } : c)));
      setPrompt("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-full">
      <div className="thin-scroll w-56 shrink-0 space-y-1 overflow-y-auto border-r border-line px-3 py-4 dark:border-border-dark">
        <button
          onClick={handleNewChapter}
          className="mb-2 w-full rounded-lg border border-dashed border-line px-3 py-2 text-left text-xs text-muted transition hover:border-plum hover:text-plum dark:border-border-dark dark:text-muted-dark"
        >
          + New chapter
        </button>
        {chapters.map((c) => (
          <div key={c.id} className="group flex items-center">
            <button
              onClick={() => selectChapter(c)}
              className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                activeId === c.id
                  ? "bg-plum text-paper"
                  : "text-ink/80 hover:bg-line/50 dark:text-ink-dark/80 dark:hover:bg-white/5"
              }`}
            >
              {c.title}
            </button>
            <button
              onClick={() => handleDelete(c.id)}
              className="ml-1 hidden shrink-0 px-1 text-muted hover:text-rust group-hover:block"
              aria-label="Delete chapter"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col">
        {activeId ? (
          <>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleSave(e.target.value, content);
              }}
              className="border-b border-line bg-transparent px-8 py-3 font-display text-lg text-ink outline-none dark:border-border-dark dark:text-ink-dark"
            />
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                scheduleSave(title, e.target.value);
              }}
              placeholder="Write, or generate below…"
              className="thin-scroll flex-1 resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/60 dark:text-ink-dark dark:placeholder:text-muted-dark/60"
            />
            <div className="border-t border-line px-8 py-4 dark:border-border-dark">
              <div className="flex items-end gap-3 rounded-2xl border border-line bg-white p-2 dark:border-border-dark dark:bg-surface-raised">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={1}
                  placeholder="Tell Pelo what to write next in this chapter…"
                  className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 dark:text-ink-dark dark:placeholder:text-muted-dark/70"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="shrink-0 rounded-full bg-plum px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-plum-dark disabled:opacity-40"
                >
                  {generating ? "Writing…" : "Generate"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted dark:text-muted-dark">
            Create a chapter to start writing.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Style Profile ----------------

function StylePanel({ project }: { project: Project }) {
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjectContext(project.id).then((ctx) => {
      setText(ctx?.style_instructions ?? "");
      setLoaded(true);
    });
  }, [project.id]);

  async function handleSave() {
    setSaving(true);
    await updateStyleInstructions(project.id, text);
    setSaving(false);
  }

  if (!loaded) return null;

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <p className="mb-4 text-sm text-muted dark:text-muted-dark">
        These instructions are injected into every generation in this project — point of view, tone, pacing rules,
        vocabulary to avoid, platform formatting requirements, whatever defines this book's voice.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        placeholder="e.g. Third-person limited. Short punchy sentences. Cliffhanger at the end of every chapter. Match Goodnovel's romance house style — no purple prose."
        className="w-full rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-ink outline-none placeholder:text-muted/60 focus:border-plum dark:border-border-dark dark:bg-surface-raised dark:text-ink-dark dark:placeholder:text-muted-dark/60"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-full bg-plum px-6 py-2.5 text-sm font-medium text-paper transition hover:bg-plum-dark disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save style profile"}
      </button>
    </div>
  );
}

// ---------------- Files ----------------

function FilesPanel({ project }: { project: Project }) {
  const [docs, setDocs] = useState<AttachedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProjectContext(project.id).then((ctx) => setDocs(ctx?.attached_documents ?? []));
  }, [project.id]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    setUploading(true);
    setError("");

    for (const file of Array.from(fileList)) {
      const { text, supported } = await extractTextFromFile(file);
      if (!supported) {
        setError(`${file.name}: only .txt and .md files are parsed for now — paste key excerpts into the style profile instead.`);
        continue;
      }
      const updated = await addAttachedDocument(project.id, { name: file.name, text });
      setDocs(updated);
    }

    setUploading(false);
  }

  async function handleRemove(name: string) {
    const updated = await removeAttachedDocument(project.id, name);
    setDocs(updated);
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <p className="mb-4 text-sm text-muted dark:text-muted-dark">
        Text pulled from these files is bundled into every generation in this project, alongside the style profile.
      </p>

      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-line bg-white/60 px-6 py-10 text-center transition hover:border-plum dark:border-border-dark dark:bg-surface-raised/60">
        <p className="font-medium text-ink dark:text-ink-dark">Click to upload .txt or .md files</p>
        <p className="mt-1 text-sm text-muted dark:text-muted-dark">PDF/DOCX parsing not wired yet</p>
        <input type="file" multiple accept=".txt,.md" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </label>

      {uploading && <p className="mt-3 text-sm text-muted dark:text-muted-dark">Reading…</p>}
      {error && <p className="mt-3 text-sm text-rust">{error}</p>}

      {docs.length > 0 && (
        <div className="mt-6 space-y-2">
          {docs.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm dark:border-border-dark dark:bg-surface-raised"
            >
              <span className="truncate text-ink dark:text-ink-dark">{d.name}</span>
              <button onClick={() => handleRemove(d.name)} className="text-muted hover:text-rust dark:text-muted-dark">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
