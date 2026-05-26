"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  FilePlus2,
  FolderOpen,
  ListChecks,
  Play,
  ScrollText,
  Sparkles,
  XCircle
} from "lucide-react";

import { AgentStatusGrid } from "@/components/dashboard/AgentStatusGrid";
import { KnowledgeAssets } from "@/components/dashboard/KnowledgeAssets";
import { RecentRuns } from "@/components/dashboard/RecentRuns";
import { StatCard } from "@/components/dashboard/StatCard";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Agent, AgentRun, KnowledgeAsset, MetricsOverview, RecentFile } from "@/lib/types";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [kbRoot, setKbRoot] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [agentData, runData, assetData, recentData, kbConfig, overviewData] = await Promise.all([
      api.agents(),
      api.runs({ limit: 100 }),
      api.assets(),
      api.recentFiles(),
      api.kbConfig(),
      api.getMetricsOverview()
    ]);
    setAgents(agentData);
    setRuns(runData);
    setAssets(assetData);
    setRecent(recentData);
    setKbRoot(kbConfig.knowledge_base_root);
    setOverview(overviewData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const agentNames = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);
  const recentFailures = runs.filter((run) => run.status === "failed").slice(0, 5);
  const topAgents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const run of runs) counts.set(run.agent_id, (counts.get(run.agent_id) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [runs]);

  async function runAgent(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const run = await api.runAgent(id);
      setMessage(`${id} 已创建运行任务：run #${run.run_id}`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "运行失败");
    } finally {
      setBusy(null);
    }
  }

  function openKbRoot() {
    if (!kbRoot) return;
    window.open(`file:///${kbRoot.replaceAll("\\", "/")}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">AgentOS Dashboard</h1>
        <p className="text-sm text-muted-foreground">本地 Agent 运维控制台：运行、观察、复盘和沉淀知识资产。</p>
      </div>

      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="今日运行" value={overview?.runs_today ?? 0} caption="今天创建的 AgentRun" icon={Play} />
        <StatCard title="今日成功" value={overview?.success_today ?? 0} caption="状态为 success" icon={CheckCircle2} />
        <StatCard title="今日失败" value={overview?.failed_today ?? 0} caption="状态为 failed" icon={XCircle} />
        <StatCard title="运行 / 等待" value={`${overview?.running_count ?? 0}/${overview?.pending_count ?? 0}`} caption="running / pending" icon={ListChecks} />
        <StatCard title="知识资产" value={overview?.total_generated_assets ?? 0} caption="KnowledgeAsset 总数" icon={FilePlus2} />
        <StatCard title="平均耗时" value={`${(overview?.average_duration_seconds ?? 0).toFixed(1)}s`} caption="全部 run 平均值" icon={Clock} />
        <StatCard title="7 天成功率" value={`${(overview?.recent_7_days_success_rate ?? 0).toFixed(1)}%`} caption={`${overview?.recent_7_days_runs ?? 0} 次运行`} icon={BarChart3} />
        <StatCard title="成本预留" value={`${(overview?.total_estimated_cost ?? 0).toFixed(4)}`} caption={`${overview?.total_tokens ?? 0} tokens`} icon={Coins} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => runAgent("ai_news_agent")} disabled={busy !== null}>
            <Play data-icon="inline-start" />
            运行 AI 情报 Agent
          </Button>
          <Button variant="secondary" onClick={() => runAgent("knowledge_organizer_agent")} disabled={busy !== null}>
            <Play data-icon="inline-start" />
            运行知识库整理 Agent
          </Button>
          <Button variant="outline" onClick={openKbRoot}>
            <FolderOpen data-icon="inline-start" />
            打开知识库目录
          </Button>
          <Button asChild variant="outline">
            <Link href="/logs">
              <ScrollText data-icon="inline-start" />
              查看最近日志
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/agents">
              <Bot data-icon="inline-start" />
              新建 Agent
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近失败 Run</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentFailures.map((run) => (
              <Link key={run.id} href={`/runs/${run.id}`} className="rounded-md border p-3 text-sm hover:bg-muted/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">#{run.id} · {agentNames.get(run.agent_id) ?? run.agent_id}</div>
                  <RunStatusBadge status={run.status} />
                </div>
                <div className="mt-2 line-clamp-2 text-xs text-red-700">{run.error_message || run.output_summary || "-"}</div>
              </Link>
            ))}
            {recentFailures.length === 0 && <div className="text-sm text-muted-foreground">最近没有失败记录。</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最常用 Agent</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topAgents.map(([agentId, count]) => (
              <Link key={agentId} href={`/agents/${agentId}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50">
                <span>{agentNames.get(agentId) ?? agentId}</span>
                <span className="text-muted-foreground">{count} runs</span>
              </Link>
            ))}
            {topAgents.length === 0 && <div className="text-sm text-muted-foreground">暂无运行数据。</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <RecentRuns runs={runs} />
        <KnowledgeAssets assets={assets} recent={recent} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Agent 状态概览</h2>
        <AgentStatusGrid agents={agents} />
      </div>
    </div>
  );
}
