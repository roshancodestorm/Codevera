export interface TreeNode {
  name: string;
  type: 'dir' | 'file';
  path: string;
  size?: number;
  children?: TreeNode[];
}

export interface WorkspaceInfo {
  name: string;
  fileCount: number;
  updatedAt: string | null;
  created: string | null;
  template: string | null;
  hasPackageJson: boolean;
  hasIndexHtml: boolean;
  local?: boolean;
  root?: string;
}

export interface SearchResult {
  file: string;
  line: number;
  text: string;
  score?: number;
  labels?: string[];
}

export interface MemoryData {
  markdown: string;
  structured: {
    architecture: string;
    conventions: string;
    decisions: string[];
    preferences: string[];
    frequentlyModified: string[];
  };
}

export interface RunResult {
  exitCode: number;
  output: string;
  durationMs: number;
}

export interface ImportGraph {
  nodes: { id: string; group: string }[];
  edges: { from: string; to: string }[];
}

export interface AgentStep {
  agent: string;
  status: 'running' | 'done' | 'error';
  message: string;
  detail?: string | null;
  at: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface AgentLog {
  kind: 'plan' | 'files' | 'build' | 'text' | 'exec' | 'tool' | 'tool_result' | 'warn';
  content: string;
  at: number;
}

export interface ExecStatus {
  index: number;
  total: number;
  milestone: string;
  action: string;
  status: 'running' | 'fixing' | 'done' | 'failed';
}

export interface PipelineResult {
  summary: string;
  files: string[];
  error?: string;
}

export interface StackOperations {
  scaffold: boolean;
  install: boolean;
  build: boolean;
  test: boolean;
  run: boolean;
  browser: boolean;
  contentChecks: boolean;
}

export interface StackSupportInfo {
  id: string;
  label: string;
  family: string;
  supportLevel: 'full' | 'scaffold-only' | 'unavailable';
  summary: string;
  requiredTools: string[];
  missingTools: string[];
  notes: string[];
  operations: StackOperations;
}

export interface ToolchainInfo {
  id: string;
  label: string;
  command: string;
  installed: boolean;
  version: string | null;
  error: string | null;
}

export interface TemplateToolchainSupport {
  templateId: string;
  supported: boolean;
  toolchain: {
    ready: boolean;
    reason: string | null;
  };
}

export interface CapabilitySnapshot {
  checkedAt: number;
  os: string;
  toolchains: ToolchainInfo[];
  stacks: StackSupportInfo[];
  templates?: TemplateToolchainSupport[];
}

export interface TemplateInfo {
  id: string;
  label: string;
  description: string;
  category: string;
  tags: string[];
  kind: string;
  fileCount: number;
  stackId: string;
  support: StackSupportInfo | null;
}

export interface CapabilityBadge {
  key: string;
  label: string;
  value: boolean;
}

export interface ApiModel {
  id: string;
  name: string;
  provider: string;
  model_id: string;
  base_url: string;
  api_key?: string;
  api_protocol?: string;
  /** Optional UI-only speed tier ('Fast' | 'High Fast' | 'Medium' | 'High'). Null/absent = no badge. */
  speed?: string | null;
  is_active: boolean;
  description?: string | null;
  group_name?: string | null;
  organization_id?: string | null;
  project_id?: string | null;
  headers?: Record<string, string> | null;
  custom_params?: Record<string, unknown> | null;
  temperature?: number | null;
  top_p?: number | null;
  top_k?: number | null;
  max_tokens?: number | null;
  context_window?: number | null;
  timeout_ms?: number | null;
  supports_streaming?: boolean | null;
  supports_vision?: boolean | null;
  supports_function_calling?: boolean | null;
  supports_reasoning?: boolean | null;
  supports_json?: boolean | null;
  supports_embeddings?: boolean | null;
  supports_image_generation?: boolean | null;
  supports_speech?: boolean | null;
  env_var_name?: string | null;
}

export interface TestResult {
  ok: boolean;
  error?: string;
  latencyMs: number;
  status?: number;
  content?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  capabilities: string[];
  description: string;
}

export interface UsageStats {
  days: number;
  totals: {
    requests: string;
    tokens: string;
    avg_latency: string;
    successes: string;
    failures: string;
  };
  byProvider: { provider: string; requests: string; tokens: string; avg_latency: string }[];
  byDay: { day: string; requests: string; tokens: string }[];
  byTask: { task: string; requests: string; failures: string }[];
}

export interface RouteConfig {
  routes: Record<string, string>;
  tasks: string[];
  models: { id: string; name: string; provider: string; model_id: string }[];
}

export interface ModelProfile {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
}

export interface ProfilesData {
  profiles: ModelProfile[];
  currentRoutes: Record<string, string>;
}

// Build Pipeline Types
export interface BuildJob {
  id: string;
  workspace: string;
  profile: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  command: string;
  cwd: string;
  pid?: number;
  exitCode?: number;
  logs: BuildLogEntry[];
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BuildLogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  data: string;
}

export interface BuildProfile {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  description?: string;
  env?: Record<string, string>;
}

export interface CreateBuildJobRequest {
  workspace: string;
  profile: string;
  command?: string;
}

export interface BuildJobListResponse {
  jobs: BuildJob[];
  active: string[];
}

export interface BuildStreamEvent {
  type: 'log' | 'status' | 'complete' | 'error';
  jobId: string;
  timestamp: string;
  data?: unknown;
}
