import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createChat, createProject, listChats, listProjects, type Project, type Chat } from "../lib/supabase";
import WorkspaceSidebar, { type WorkspaceView } from "../components/WorkspaceSidebar";
import ChatView from "../components/ChatView";
import ProjectView from "../components/ProjectView";

export default function Workspace() {
  const { user } = useAuth();
  const [view, setView] = useState<WorkspaceView>({ type: "empty" });
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleNewChat() {
    if (!user) return;
    const chat = await createChat(user.id);
    setActiveChat(chat);
    setActiveProject(null);
    setView({ type: "chat", id: chat.id });
    setRefreshKey((k) => k + 1);
  }

  async function handleNewProject() {
    if (!user) return;
    const name = prompt("Project name (e.g. the book title)");
    if (!name?.trim()) return;
    const project = await createProject(user.id, name.trim());
    setActiveProject(project);
    setActiveChat(null);
    setView({ type: "project", id: project.id });
    setRefreshKey((k) => k + 1);
  }

  // These fetch-by-id lookups are intentionally simple — the sidebar already
  // holds the full lists, so we just need the clicked row's data here.
  async function handleSelectChat(id: string) {
    if (!user) return;
    const chats = await listChats(user.id);
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      setActiveChat(chat);
      setActiveProject(null);
      setView({ type: "chat", id });
    }
  }

  async function handleSelectProject(id: string) {
    if (!user) return;
    const projects = await listProjects(user.id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setActiveProject(project);
      setActiveChat(null);
      setView({ type: "project", id });
    }
  }

  return (
    <div className="flex h-screen bg-paper dark:bg-surface">
      <WorkspaceSidebar
        view={view}
        onSelectChat={handleSelectChat}
        onSelectProject={handleSelectProject}
        onNewChat={handleNewChat}
        onNewProject={handleNewProject}
        refreshKey={refreshKey}
      />
      <main className="flex-1 overflow-hidden">
        {view.type === "chat" && activeChat && <ChatView chat={activeChat} />}
        {view.type === "project" && activeProject && <ProjectView project={activeProject} />}
        {view.type === "empty" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="font-display text-2xl text-ink dark:text-ink-dark">Start a chat or open a project</p>
            <p className="max-w-sm text-sm text-muted dark:text-muted-dark">
              Chats are for quick brainstorming. Projects hold chapters, a style profile, and reference documents
              that persist across every generation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
