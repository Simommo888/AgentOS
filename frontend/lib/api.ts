import type {
  Agent,
  AgentHealth,
  AgentLog,
  AgentRun,
  AgentRunStart,
  KnowledgeAsset,
  Prompt,
  RecentFile,
  RunQueue,
  Schedule,
  Settings,
  ToolPermission
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_AGENTOS_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data.detail ?? message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  agents: () => request<Agent[]>("/api/agents"),
  agent: (id: string) => request<Agent>(`/api/agents/${id}`),
  agentHealth: (id: string) => request<AgentHealth>(`/api/agents/${id}/health`),
  createAgent: (payload: Partial<Agent> & { id: string }) =>
    request<Agent>("/api/agents", { method: "POST", body: JSON.stringify(payload) }),
  updateAgent: (id: string, payload: Partial<Agent>) =>
    request<Agent>(`/api/agents/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  runAgent: (id: string) => request<AgentRunStart>(`/api/agents/${id}/run`, { method: "POST" }),
  enableAgent: (id: string) => request<Agent>(`/api/agents/${id}/enable`, { method: "POST" }),
  disableAgent: (id: string) => request<Agent>(`/api/agents/${id}/disable`, { method: "POST" }),
  runs: (params?: { status?: string; agent_id?: string; limit?: number; date?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.agent_id) search.set("agent_id", params.agent_id);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.date) search.set("date", params.date);
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<AgentRun[]>(`/api/runs${suffix}`);
  },
  runQueue: () => request<RunQueue>("/api/runs/queue"),
  run: (id: number) => request<AgentRun>(`/api/runs/${id}`),
  cancelRun: (id: number) => request<AgentRun>(`/api/runs/${id}/cancel`, { method: "POST" }),
  runLogs: (id: number) => request<AgentLog[]>(`/api/runs/${id}/logs`),
  logs: () => request<AgentLog[]>("/api/logs"),
  prompts: () => request<Prompt[]>("/api/prompts"),
  createPrompt: (payload: Partial<Prompt>) =>
    request<Prompt>("/api/prompts", { method: "POST", body: JSON.stringify(payload) }),
  updatePrompt: (id: number, payload: Partial<Prompt>) =>
    request<Prompt>(`/api/prompts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePrompt: (id: number) => request<{ message: string }>(`/api/prompts/${id}`, { method: "DELETE" }),
  schedules: () => request<Schedule[]>("/api/schedules"),
  createSchedule: (payload: Partial<Schedule>) =>
    request<Schedule>("/api/schedules", { method: "POST", body: JSON.stringify(payload) }),
  updateSchedule: (id: number, payload: Partial<Schedule>) =>
    request<Schedule>(`/api/schedules/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  enableSchedule: (id: number) => request<Schedule>(`/api/schedules/${id}/enable`, { method: "POST" }),
  disableSchedule: (id: number) => request<Schedule>(`/api/schedules/${id}/disable`, { method: "POST" }),
  runSchedule: (id: number) => request<AgentRun>(`/api/schedules/${id}/run`, { method: "POST" }),
  assets: (params?: { category?: string; search?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.category && params.category !== "all") search.set("category", params.category);
    if (params?.search) search.set("search", params.search);
    if (params?.limit) search.set("limit", String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<KnowledgeAsset[]>(`/api/knowledge-base/assets${suffix}`);
  },
  recentFiles: (params?: { category?: string; search?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.category && params.category !== "all") search.set("category", params.category);
    if (params?.search) search.set("search", params.search);
    if (params?.limit) search.set("limit", String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<RecentFile[]>(`/api/knowledge-base/recent${suffix}`);
  },
  kbConfig: () => request<{ knowledge_base_root: string; categories: Record<string, string>; default_output_dir: string; excluded_dirs?: string[]; excluded_files?: string[] }>("/api/knowledge-base/config"),
  tools: () => request<{ name: string; description: string }[]>("/api/tools"),
  toolPermissions: () => request<ToolPermission[]>("/api/tools/permissions"),
  updateToolPermission: (id: number, payload: Partial<ToolPermission>) =>
    request<ToolPermission>(`/api/tools/permissions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (payload: Partial<Settings>) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(payload) })
};
