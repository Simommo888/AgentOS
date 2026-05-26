export type Agent = {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  entrypoint: string;
  working_directory: string;
  command: string;
  schedule: string;
  output_type: string;
  output_path: string;
  config_json: string;
  tools_json: string;
  prompts_json: string;
  workflow_json: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string | null;
  last_run_status: string;
};

export type AgentRun = {
  id: number;
  agent_id: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  duration_seconds?: number | null;
  command: string;
  stdout: string;
  stderr: string;
  output_summary: string;
  output_files_json: string;
  error_message: string;
  created_at: string;
};

export type AgentRunStart = {
  run_id: number;
  agent_id: string;
  status: "pending" | "running" | "success" | "failed" | "cancelled" | string;
  message: string;
};

export type RunQueueItem = {
  run_id: number;
  agent_id: string;
  agent_name: string;
  status: string;
  started_at: string;
  duration_seconds?: number | null;
  command: string;
  output_summary: string;
  error_message: string;
};

export type RunQueue = {
  pending_runs: RunQueueItem[];
  running_runs: RunQueueItem[];
  recently_finished_runs: RunQueueItem[];
  active_count: number;
  pending_count: number;
  failed_count_today: number;
  success_count_today: number;
};

export type AgentLog = {
  id: number;
  run_id?: number | null;
  agent_id: string;
  level: string;
  message: string;
  timestamp: string;
  metadata_json: string;
};

export type Prompt = {
  id: number;
  title: string;
  agent_id?: string | null;
  scenario: string;
  content: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
};

export type Schedule = {
  id: number;
  agent_id: string;
  cron: string;
  enabled: boolean;
  next_run_at?: string | null;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type KnowledgeAsset = {
  id: number;
  agent_id?: string | null;
  run_id?: number | null;
  title: string;
  asset_type: string;
  file_path: string;
  suggested_location: string;
  tags_json: string;
  created_at: string;
  file_exists?: boolean;
  is_empty?: boolean;
  file_empty?: boolean;
  file_size?: number;
  modified_at?: number | null;
  warning?: string;
  readable?: boolean;
  preview?: string;
  absolute_path?: string;
};

export type RecentFile = {
  title: string;
  file_path: string;
  asset_type: string;
  suggested_location: string;
  preview: string;
  file_exists?: boolean;
  is_empty?: boolean;
  file_empty?: boolean;
  file_size?: number;
  modified_at?: number | null;
  warning?: string;
  readable?: boolean;
  updated_at: number;
};

export type ToolPermission = {
  id: number;
  agent_id: string;
  tool_name: string;
  permission: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  knowledge_base_root: string;
  python_path: string;
  default_output_dir: string;
  llm_provider: string;
  database_url: string;
  required_env: string[];
  security_notes: string[];
};

export type AgentHealth = {
  agent_id: string;
  entrypoint_exists: boolean;
  working_directory_exists: boolean;
  output_path_exists: boolean;
  requirements_exists: boolean;
  openai_api_key_configured: boolean;
  can_run: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  entrypoint_path: string;
  working_directory_path: string;
  output_path: string;
  requirements_path: string;
  missing_requirements: string[];
};

export type WorkflowNodeData = {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
};

export type WorkflowDefinition = {
  nodes: WorkflowNodeData[];
  edges: { id: string; source: string; target: string }[];
};
