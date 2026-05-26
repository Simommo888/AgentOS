"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Clock, Coins, Cpu, FileText, RotateCcw } from "lucide-react";

import { RunArtifacts } from "@/components/runs/RunArtifacts";
import { RunLogViewer } from "@/components/runs/RunLogViewer";
import { RunOutputViewer } from "@/components/runs/RunOutputViewer";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { RunArtifact, RunDetail } from "@/lib/types";
import { formatDate, parseJson } from "@/lib/utils";

const activeStatuses = new Set(["pending", "running"]);

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const runId = Number(params.id);
  const [run, setRun] = useState<RunDetail | null>(null);
  const [artifacts, setArtifacts] = useState<RunArtifact[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [runData, artifactData] = await Promise.all([api.getRun(runId), api.getRunArtifacts(runId)]);
    setRun(runData);
    setArtifacts(artifactData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [runId]);

  const isRunning = Boolean(run && activeStatuses.has(run.status));

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      load().catch((error) => setMessage(error.message));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isRunning, runId]);

  const outputCount = useMemo(() => parseJson<string[]>(run?.output_files_json, []).length, [run?.output_files_json]);

  if (!run) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">正在加载 Run #{runId}...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="flex flex-col gap-2">
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/runs">
              <ArrowLeft data-icon="inline-start" />
              返回 Runs
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Run #{run.id}</h1>
            <RunStatusBadge status={run.status} />
            {(run.retry_count ?? 0) > 0 && <Badge variant="warning">retry #{run.retry_count}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{run.agent?.name ?? run.agent_id}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/agents/${run.agent_id}`}>
            <Bot data-icon="inline-start" />
            打开 Agent
          </Link>
        </Button>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">开始 / 结束</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div>{formatDate(run.started_at)}</div>
            <div className="mt-1 text-muted-foreground">{formatDate(run.finished_at)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">耗时 / timeout</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span>{run.duration_seconds ? `${run.duration_seconds.toFixed(2)}s` : "-"}</span>
            <span className="text-muted-foreground">/ {run.timeout_seconds ?? "-"}s</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">LLM tokens</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            <Cpu className="size-4 text-muted-foreground" />
            <span>{run.total_tokens || 0}</span>
            <span className="text-muted-foreground">{run.llm_model || "reserved"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">成本 / 文件</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-sm">
            <Coins className="size-4 text-muted-foreground" />
            <span>{(run.estimated_cost || 0).toFixed(6)} {run.cost_currency || "USD"}</span>
            <span className="text-muted-foreground">· {outputCount} files</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>命令与运行信息</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">{run.command || "-"}</pre>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">retry</div>
              <div className="mt-1 flex items-center gap-2">
                <RotateCcw className="size-4 text-muted-foreground" />
                #{run.retry_count ?? 0}
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">parent_run_id</div>
              <div className="mt-1">{run.parent_run_id ? `#${run.parent_run_id}` : "-"}</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-xs text-muted-foreground">cancelled_by</div>
              <div className="mt-1">{run.cancelled_by || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>stdout / stderr</CardTitle>
        </CardHeader>
        <CardContent>
          <RunOutputViewer output={run} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>输出文件</CardTitle>
          </CardHeader>
          <CardContent>
            <RunArtifacts artifacts={artifacts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>KnowledgeAsset</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {run.knowledge_assets.map((asset) => (
              <div key={asset.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="size-4 text-muted-foreground" />
                  {asset.title}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{asset.file_path}</div>
                <Badge className="mt-2" variant="secondary">{asset.suggested_location}</Badge>
              </div>
            ))}
            {run.knowledge_assets.length === 0 && <div className="text-sm text-muted-foreground">暂无 KnowledgeAsset 索引。</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>日志流</CardTitle>
        </CardHeader>
        <CardContent>
          <RunLogViewer logs={run.logs} runId={run.id} isRunning={isRunning} />
        </CardContent>
      </Card>
    </div>
  );
}
