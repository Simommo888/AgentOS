"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ExternalLink, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

const terminalStatuses = new Set(["success", "failed", "cancelled"]);

export function RunAgentButton({
  agentId,
  onDone
}: {
  agentId: string;
  onDone?: (message: string, run?: AgentRun) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!runId || terminalStatuses.has(status)) return;
    const currentRunId = runId;

    let stopped = false;
    async function poll() {
      try {
        const run = await api.run(currentRunId);
        if (stopped) return;
        setStatus(run.status);
        if (terminalStatuses.has(run.status)) {
          setBusy(false);
          onDone?.(`运行任务 #${run.id} 已结束：${run.status}`, run);
        }
      } catch (error) {
        if (stopped) return;
        setBusy(false);
        onDone?.(error instanceof Error ? error.message : "刷新运行状态失败");
      }
    }

    poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [runId, status, onDone]);

  async function run() {
    setBusy(true);
    setStatus("");
    try {
      const result = await api.runAgent(agentId);
      setRunId(result.run_id);
      setStatus(result.status);
      onDone?.(`已创建运行任务 #${result.run_id}，后台正在执行。`);
    } catch (error) {
      setBusy(false);
      onDone?.(error instanceof Error ? error.message : "运行失败");
    }
  }

  const label = busy ? (runId ? `运行中 #${runId}` : "创建中") : "立即运行";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? <Activity data-icon="inline-start" /> : <Play data-icon="inline-start" />}
        {label}
      </Button>
      {runId && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/runs?run_id=${runId}`}>
            <ExternalLink data-icon="inline-start" />
            查看运行详情
          </Link>
        </Button>
      )}
    </div>
  );
}
