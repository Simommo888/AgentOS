"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, FilePlus2, FolderOpen, Play, ScrollText, Sparkles } from "lucide-react";

import { AgentStatusGrid } from "@/components/dashboard/AgentStatusGrid";
import { KnowledgeAssets } from "@/components/dashboard/KnowledgeAssets";
import { RecentRuns } from "@/components/dashboard/RecentRuns";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Agent, AgentRun, KnowledgeAsset, RecentFile } from "@/lib/types";

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [kbRoot, setKbRoot] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const [agentData, runData, assetData, recentData, kbConfig] = await Promise.all([
      api.agents(),
      api.runs(),
      api.assets(),
      api.recentFiles(),
      api.kbConfig()
    ]);
    setAgents(agentData);
    setRuns(runData);
    setAssets(assetData);
    setRecent(recentData);
    setKbRoot(kbConfig.knowledge_base_root);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayRuns = runs.filter((run) => new Date(run.started_at).toDateString() === today);
    const failed = runs.filter((run) => run.status === "failed").slice(0, 10).length;
    const todayAssets = assets.filter((asset) => new Date(asset.created_at).toDateString() === today).length;
    return {
      total: agents.length,
      enabled: agents.filter((agent) => agent.status === "enabled").length,
      todayRuns: todayRuns.length,
      failed,
      todayAssets
    };
  }, [agents, runs, assets]);

  async function runAgent(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const run = await api.runAgent(id);
      setMessage(`${id} 运行完成：${run.status}`);
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
        <p className="text-sm text-muted-foreground">一个本地可运行的个人 Agent 管理工作台。</p>
      </div>

      {message && (
        <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Agent 总数" value={stats.total} caption="已注册 Agent" icon={Bot} />
        <StatCard title="启用中" value={stats.enabled} caption="可手动或定时运行" icon={Sparkles} />
        <StatCard title="今日运行" value={stats.todayRuns} caption="本地执行记录" icon={Play} />
        <StatCard title="最近失败" value={stats.failed} caption="最近 10 条内失败" icon={AlertTriangle} />
        <StatCard title="今日资产" value={stats.todayAssets} caption="写入知识库索引" icon={FilePlus2} />
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
