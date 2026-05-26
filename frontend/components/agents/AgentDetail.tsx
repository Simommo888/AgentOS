"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Coins, FolderOpen, KeyRound, Power, RefreshCw, XCircle } from "lucide-react";

import { AgentConfigForm } from "@/components/agents/AgentConfigForm";
import { RunAgentButton } from "@/components/agents/RunAgentButton";
import { CancelRunButton } from "@/components/runs/CancelRunButton";
import { RunLogViewer } from "@/components/runs/RunLogViewer";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Agent, AgentHealth, AgentLog, AgentMetrics, AgentRun, KnowledgeAsset, Prompt, ToolPermission, WorkflowDefinition } from "@/lib/types";
import { formatDate, parseJson } from "@/lib/utils";

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={ok ? "success" : "destructive"}>
        {ok ? <CheckCircle2 className="mr-1 size-3" /> : <XCircle className="mr-1 size-3" />}
        {ok ? "OK" : "需要处理"}
      </Badge>
    </div>
  );
}

function HealthCard({ agent, health, lastRun }: { agent: Agent; health: AgentHealth | null; lastRun?: AgentRun }) {
  if (!health) {
    return <Card><CardHeader><CardTitle>健康检查</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">正在加载健康检查...</CardContent></Card>;
  }
  const isAiNews = agent.id === "ai_news_agent";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>健康检查</CardTitle>
        <Badge variant={health.can_run ? "success" : "destructive"}>{health.can_run ? "can_run" : "blocked"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <HealthRow label="Entrypoint" ok={health.entrypoint_exists} />
        <HealthRow label="Working Directory" ok={health.working_directory_exists} />
        <HealthRow label="Output Path" ok={health.output_path_exists} />
        {isAiNews && (
          <>
            <HealthRow label="requirements.txt" ok={health.requirements_exists} />
            <div className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground"><KeyRound className="size-4" />OPENAI_API_KEY</span>
              <Badge variant={health.openai_api_key_configured ? "success" : "warning"}>
                {health.openai_api_key_configured ? "已配置" : "未配置，自动 no-llm"}
              </Badge>
            </div>
            <div className="rounded-md border bg-muted p-3 text-xs text-muted-foreground">
              <div>requirements: {health.requirements_path || "-"}</div>
              <div className="mt-1">日报输出目录: {health.output_path}</div>
            </div>
          </>
        )}
        {lastRun?.error_message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="mb-1 flex items-center gap-2 font-medium"><AlertTriangle className="size-4" />最近一次运行错误</div>
            <p className="break-words">{lastRun.error_message}</p>
          </div>
        )}
        {health.errors.map((item) => <div key={item} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{item}</div>)}
        {health.warnings.map((item) => <div key={item} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{item}</div>)}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium">推荐修复动作</div>
          {(health.recommendations.length > 0 ? health.recommendations : ["当前健康检查通过，可以直接运行。"]).map((item) => (
            <div key={item} className="rounded-md border p-3 text-sm text-muted-foreground">{item}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RuntimeCard({ agent, activeRun, lastRun }: { agent: Agent; activeRun?: AgentRun; lastRun?: AgentRun }) {
  const queued = activeRun?.status === "pending";
  const running = activeRun?.status === "running";
  const timeoutHit = lastRun?.error_message?.toLowerCase().includes("timed out");
  const retried = Boolean((lastRun?.retry_count ?? 0) > 0 || lastRun?.parent_run_id);
  return (
    <Card>
      <CardHeader><CardTitle>运行可靠性配置</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCell label="timeout_seconds" value={`${agent.timeout_seconds ?? 1800}s`} />
        <MetricCell label="retry_enabled" value={agent.retry_enabled ? "enabled" : "disabled"} />
        <MetricCell label="max_retries" value={agent.max_retries ?? 0} />
        <MetricCell label="retry_delay" value={`${agent.retry_delay_seconds ?? 30}s`} />
        <MetricCell label="队列 / 运行" value={running ? "running" : queued ? "pending" : "idle"} />
        <div className="rounded-md border p-3 text-sm">
          <div className="text-xs text-muted-foreground">最近 timeout / retry</div>
          <div className="mt-2 flex gap-2">
            <Badge variant={timeoutHit ? "destructive" : "muted"}>{timeoutHit ? "timeout" : "no timeout"}</Badge>
            <Badge variant={retried ? "warning" : "muted"}>{retried ? "retried" : "no retry"}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}

function AgentMetricsCard({ metrics, lastRun }: { metrics: AgentMetrics | null; lastRun?: AgentRun }) {
  return (
    <Card>
      <CardHeader><CardTitle>运行指标</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCell label="总运行次数" value={metrics?.total_runs ?? 0} />
        <MetricCell label="成功率" value={`${(metrics?.success_rate ?? 0).toFixed(1)}%`} />
        <MetricCell label="平均耗时" value={`${(metrics?.average_duration_seconds ?? 0).toFixed(1)}s`} />
        <MetricCell label="7 天运行数" value={metrics?.recent_7_days_runs ?? 0} />
        <MetricCell label="7 天成功率" value={`${(metrics?.recent_7_days_success_rate ?? 0).toFixed(1)}%`} />
        <MetricCell label="总资产数" value={metrics?.total_generated_assets ?? 0} />
        <MetricCell label="总 tokens" value={metrics?.total_tokens ?? 0} />
        <MetricCell label="成本预留" value={`${(metrics?.total_estimated_cost ?? 0).toFixed(6)}`} />
        <div className="rounded-md border p-3 text-sm md:col-span-3 xl:col-span-4">
          <div className="text-xs text-muted-foreground">最近失败原因</div>
          <div className="mt-2 line-clamp-2 text-red-700">{lastRun?.status === "failed" ? lastRun.error_message || "-" : "-"}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentDetail({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [permissions, setPermissions] = useState<ToolPermission[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [agentData, healthData, metricsData, runData, logData, promptData, permissionData, assetData] = await Promise.all([
      api.agent(agentId),
      api.agentHealth(agentId),
      api.agentMetrics(agentId),
      api.runs({ agent_id: agentId, limit: 100 }),
      api.logs(),
      api.prompts(),
      api.toolPermissions(),
      api.assets()
    ]);
    const active = runData.find((run) => run.status === "pending" || run.status === "running");
    const agentLogs = active ? await api.runLogs(active.id) : logData.filter((log) => log.agent_id === agentId);
    setAgent(agentData);
    setHealth(healthData);
    setMetrics(metricsData);
    setRuns(runData);
    setLogs(agentLogs);
    setPrompts(promptData.filter((prompt) => prompt.agent_id === agentId));
    setPermissions(permissionData.filter((permission) => permission.agent_id === agentId));
    setAssets(assetData.filter((asset) => asset.agent_id === agentId));
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [agentId]);

  const workflow = useMemo<WorkflowDefinition>(() => parseJson(agent?.workflow_json, { nodes: [], edges: [] }), [agent]);
  const lastRun = runs[0];
  const activeRun = runs.find((run) => run.status === "pending" || run.status === "running");

  useEffect(() => {
    if (!activeRun) return;
    const timer = window.setInterval(() => load().catch((error) => setMessage(error.message)), 2000);
    return () => window.clearInterval(timer);
  }, [activeRun?.id, activeRun?.status, agentId]);

  async function toggle() {
    if (!agent) return;
    const next = agent.status === "enabled" ? await api.disableAgent(agent.id) : await api.enableAgent(agent.id);
    setAgent(next);
    setMessage(`${next.name} 当前状态: ${next.status}`);
  }

  function openOutput() {
    const path = health?.output_path || agent?.output_path;
    if (!path) return;
    window.open(`file:///${path.replaceAll("\\", "/")}`);
  }

  if (!agent) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">正在加载 Agent...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{agent.name}</h1>
            <Badge variant={agent.status === "enabled" ? "success" : "muted"}>{agent.status}</Badge>
            <Badge variant="secondary">{agent.type}</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunAgentButton agentId={agent.id} onDone={(text) => { setMessage(text); load(); }} />
          <Button variant="outline" onClick={toggle}><Power data-icon="inline-start" />启用 / 禁用</Button>
          {activeRun && <CancelRunButton runId={activeRun.id} onCancelled={() => load().catch((error) => setMessage(error.message))} />}
          <Button variant="outline" onClick={openOutput}><FolderOpen data-icon="inline-start" />打开输出目录</Button>
        </div>
      </div>

      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <Card>
        <CardHeader><CardTitle>当前运行状态</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <MetricCell label="是否正在运行" value={activeRun ? activeRun.status : "idle"} />
          <MetricCell label="当前 run_id" value={activeRun ? `#${activeRun.id}` : "-"} />
          <div className="rounded-md border p-3 text-sm">
            <div className="text-xs text-muted-foreground">上次运行状态</div>
            {lastRun ? <RunStatusBadge status={lastRun.status} /> : <Badge className="mt-2">{agent.last_run_status}</Badge>}
          </div>
          <div className="rounded-md border p-3 text-sm">
            <div className="text-xs text-muted-foreground">上次错误</div>
            <div className="mt-2 line-clamp-2 text-xs text-red-700">{lastRun?.error_message || "-"}</div>
          </div>
        </CardContent>
      </Card>

      <AgentMetricsCard metrics={metrics} lastRun={lastRun} />
      <RuntimeCard agent={agent} activeRun={activeRun} lastRun={lastRun} />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader><CardTitle>Agent 配置</CardTitle></CardHeader>
          <CardContent>
            <AgentConfigForm agent={agent} onSaved={(saved) => { setAgent(saved); setMessage("配置已保存"); load(); }} />
          </CardContent>
        </Card>
        <HealthCard agent={agent} health={health} lastRun={lastRun} />
      </div>

      <Card>
        <CardHeader><CardTitle>Agent 工作流图</CardTitle></CardHeader>
        <CardContent><WorkflowCanvas workflow={workflow} /></CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>最近运行记录</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {runs.slice(0, 6).map((run) => (
              <div key={run.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <RunStatusBadge status={run.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(run.started_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />timeout {run.timeout_seconds ?? agent.timeout_seconds ?? 1800}s</span>
                  {(run.retry_count ?? 0) > 0 && <span className="inline-flex items-center gap-1"><RefreshCw className="size-3" />retry #{run.retry_count}</span>}
                  <span className="inline-flex items-center gap-1"><Coins className="size-3" />{(run.estimated_cost || 0).toFixed(6)} {run.cost_currency || "USD"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{run.output_summary || "-"}</p>
                {run.error_message && <p className="mt-2 text-xs text-red-700">{run.error_message}</p>}
              </div>
            ))}
            {runs.length === 0 && <p className="text-sm text-muted-foreground">暂无运行记录</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>最近输出文件</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {assets.slice(0, 8).map((asset) => (
              <div key={asset.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{asset.title}</div>
                <div className="truncate text-xs text-muted-foreground">{asset.file_path}</div>
                {asset.is_empty && <div className="mt-2 text-xs text-amber-700">文件为空，请检查 Agent 输出。</div>}
                {asset.file_exists === false && <div className="mt-2 text-xs text-red-700">文件不存在或无法读取。</div>}
              </div>
            ))}
            {assets.length === 0 && <p className="text-sm text-muted-foreground">暂无输出文件索引</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Prompt 与工具权限</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {prompts.map((prompt) => <Badge key={prompt.id} variant="secondary">{prompt.title}</Badge>)}
              {prompts.length === 0 && <span className="text-sm text-muted-foreground">暂无关联 Prompt</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => <Badge key={permission.id} variant="outline">{permission.tool_name}: {permission.permission}</Badge>)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>最近日志</CardTitle></CardHeader>
        <CardContent>
          <RunLogViewer logs={logs.slice(0, 30)} runId={activeRun?.id ?? lastRun?.id} isRunning={Boolean(activeRun)} />
        </CardContent>
      </Card>
    </div>
  );
}
