"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { RunLogViewer } from "@/components/runs/RunLogViewer";
import { RunQueue } from "@/components/runs/RunQueue";
import { RunTable } from "@/components/runs/RunTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Agent, AgentLog, AgentRun, RunQueue as RunQueueType } from "@/lib/types";

const activeStatuses = new Set(["pending", "running"]);

export default function RunsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [queue, setQueue] = useState<RunQueueType | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [message, setMessage] = useState("");

  const selected = useMemo(() => runs.find((run) => run.id === selectedId) ?? null, [runs, selectedId]);
  const hasActiveRun = runs.some((run) => activeStatuses.has(run.status)) || Boolean(queue?.active_count);
  const selectedIsRunning = Boolean(selected && activeStatuses.has(selected.status));

  async function loadRuns() {
    const [agentData, runData, queueData] = await Promise.all([
      api.agents(),
      api.runs({ limit: 100 }),
      api.runQueue()
    ]);
    setAgents(agentData);
    setRuns(runData);
    setQueue(queueData);
    if (!selectedId && runData.length > 0) setSelectedId(runData[0].id);
  }

  useEffect(() => {
    const queryRunId = Number(new URLSearchParams(window.location.search).get("run_id"));
    if (queryRunId) setSelectedId(queryRunId);
    loadRuns().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(() => {
      loadRuns().catch((error) => setMessage(error.message));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const runId = selectedId;
    let stopped = false;
    async function loadLogs() {
      try {
        const logData = await api.runLogs(runId);
        if (!stopped) setLogs(logData);
      } catch (error) {
        if (!stopped) setMessage(error instanceof Error ? error.message : "加载日志失败");
      }
    }

    loadLogs();
    if (!selectedIsRunning) return () => {
      stopped = true;
    };
    const timer = window.setInterval(loadLogs, 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [selectedId, selectedIsRunning]);

  async function refresh() {
    await loadRuns();
    if (selectedId) setLogs(await api.runLogs(selectedId));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Runs</h1>
        <p className="text-sm text-muted-foreground">查看运行队列、实时状态、耗时、retry、timeout、成本预留和输出文件。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <RunQueue queue={queue} onSelect={setSelectedId} onChanged={() => refresh().catch((error) => setMessage(error.message))} />
      <RunTable
        runs={runs}
        agents={agents}
        selectedId={selectedId}
        onChanged={() => refresh().catch((error) => setMessage(error.message))}
        onSelect={(run) => setSelectedId(run.id)}
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{selected ? `Run #${selected.id} 日志` : "运行日志"}</CardTitle>
          {selected && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/runs/${selected.id}`}>查看详情</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <RunLogViewer logs={logs} runId={selectedId} isRunning={selectedIsRunning} />
        </CardContent>
      </Card>
    </div>
  );
}
