import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { listChats, listProjects, type Chat, type Project } from "../lib/supabase";
import PeloMark from "./PeloMark";

export type WorkspaceView =
  | { type: "chat"; id: string }
  | { type: "project"; id: string }
  | { type: "empty" };

type Props = {
  view: WorkspaceView;
  onSelectChat: (id: string) => void;
  onSelectProject: (id: string) => void;
  onNewChat: () => void;
  onNewProject: () => void;
  refreshKey: number;
};

export default function WorkspaceSidebar({ view, onSelectChat, onSelectProject, onNewChat, onNewProject, refreshKey }: Props) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    listChats(user.id).then(setChats).catch(console.error);
    listProjects(user.id).then(setProjects).catch(console.error);
  }, [user, refreshKey]);

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-line bg-parchment dark:border-border-dark dark:bg-surface">
      <div className="border-b border-line px-4 py-4 dark:border-border-dark">
        <PeloMark size="sm" />
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-3 py-4">
        <SectionHeader label="Projects" onAdd={onNewProject} />
        <div className="mb-6 space-y-0.5">
          {projects.length === 0 && <EmptyHint text="No projects yet" />}
          {projects.map((p) => (
            <NavItem
              key={p.id}
              label={p.name}
              icon={<FolderIcon />}
              active={view.type === "project" && view.id === p.id}
              onClick={() => onSelectProject(p.id)}
            />
          ))}
        </div>

        <SectionHeader label="Chats" onAdd={onNewChat} />
        <div className="space-y-0.5">
          {chats.length === 0 && <EmptyHint text="No chats yet" />}
          {chats.map((c) => (
            <NavItem
              key={c.id}
              label={c.title}
              icon={<ChatIcon />}
              active={view.type === "chat" && view.id === c.id}
              onClick={() => onSelectChat(c.id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-line px-3 py-3 dark:border-border-dark">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/70 transition hover:bg-line/50 dark:text-ink-dark/70 dark:hover:bg-white/5"
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <div className="truncate px-3 text-xs text-muted dark:text-muted-dark">{profile?.email}</div>
        <button
          onClick={signOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink/70 transition hover:bg-line/50 dark:text-ink-dark/70 dark:hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function SectionHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="mb-1.5 flex items-center justify-between px-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted dark:text-muted-dark">{label}</span>
      <button
        onClick={onAdd}
        className="rounded-md p-1 text-muted transition hover:bg-line/60 hover:text-ink dark:text-muted-dark dark:hover:bg-white/10 dark:hover:text-ink-dark"
        aria-label={`New ${label.slice(0, -1)}`}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 truncate rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-plum text-paper dark:bg-plum/60 dark:text-ink-dark"
          : "text-ink/80 hover:bg-line/50 dark:text-ink-dark/80 dark:hover:bg-white/5"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="px-3 py-1.5 text-xs text-muted dark:text-muted-dark">{text}</div>;
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5Z" />
    </svg>
  );
}
