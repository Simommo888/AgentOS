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
  timeout_seconds: number;
  retry_enabled: boolean;
  max_retries: number;
  retry_delay_seconds: number;
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
  retry_count: number;
  parent_run_id?: number | null;
  timeout_seconds?: number | null;
  cancelled_by: string;
  metadata_json: string;
  llm_provider: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  cost_currency: string;
};

export type RunDetail = AgentRun & {
  agent?: Agent | null;
  logs: AgentLog[];
  knowledge_assets: KnowledgeAsset[];
};

export type RunArtifact = {
  title: string;
  file_path: string;
  asset_type: string;
  file_exists: boolean;
  file_size: number;
  modified_at?: number | null;
  preview: string;
  warning: string;
  readable: boolean;
};

export type LLMUsage = {
  llm_provider: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  cost_currency: string;
};

export type RunOutput = {
  stdout: string;
  stderr: string;
  output_summary: string;
  error_message: string;
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
  retry_count: number;
  timeout_seconds?: number | null;
};

export type RunQueue = {
  pending_runs: RunQueueItem[];
  running_runs: RunQueueItem[];
  recently_finished_runs: RunQueueItem[];
  active_count: number;
  pending_count: number;
  running_count: number;
  max_concurrent_runs: number;
  failed_count_today: number;
  success_count_today: number;
};

export type AgentMetrics = {
  agent_id: string;
  total_runs: number;
  success_runs: number;
  failed_runs: number;
  cancelled_runs: number;
  timeout_runs: number;
  success_rate: number;
  failure_rate: number;
  average_duration_seconds: number;
  last_run_at?: string | null;
  last_success_at?: string | null;
  last_failed_at?: string | null;
  total_generated_assets: number;
  total_estimated_cost: number;
  total_tokens: number;
  recent_7_days_runs: number;
  recent_7_days_success_rate: number;
};

export type MetricsOverview = {
  total_agents: number;
  enabled_agents: number;
  total_runs: number;
  runs_today: number;
  success_today: number;
  failed_today: number;
  cancelled_today: number;
  running_count: number;
  pending_count: number;
  total_generated_assets: number;
  average_duration_seconds: number;
  total_estimated_cost: number;
  total_tokens: number;
  recent_7_days_runs: number;
  recent_7_days_success_rate: number;
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
  max_concurrent_runs: number;
  default_timeout_seconds: number;
  excluded_dirs: string[];
  excluded_files: string[];
  max_recent_files: number;
  default_asset_limit: number;
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
