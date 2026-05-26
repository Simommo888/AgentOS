"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { AgentLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_AGENTOS_API_BASE ?? "http://localhost:8000";

type ConnectionState = "实时连接中" | "已完成" | "已回退轮询" | "连接失败";

function levelVariant(level: string) {
  if (level === "error") return "destructive";
  if (level === "warning") return "warning";
  return "secondary";
}

function levelClass(level: string) {
  if (level === "error") return "border-red-500/60 bg-red-950/30";
  if (level === "warning") return "border-amber-500/50 bg-amber-950/20";
  return "border-slate-800";
}

function connectionVariant(connection: ConnectionState) {
  if (connection === "实时连接中") return "success";
  if (connection === "已回退轮询") return "warning";
  if (connection === "连接失败") return "destructive";
  return "secondary";
}

export function RunLogViewer({
  logs,
  runId,
  isRunning = false
}: {
  logs: AgentLog[];
  runId?: number | null;
  isRunning?: boolean;
}) {
  const [items, setItems] = useState<AgentLog[]>(logs);
  const [connection, setConnection] = useState<ConnectionState>("已完成");

  useEffect(() => {
    setItems(logs);
  }, [logs]);

  useEffect(() => {
    if (!runId || !isRunning) {
      setConnection(isRunning ? "连接失败" : "已完成");
      return;
    }

    const activeRunId = runId;
    let stopped = false;
    let pollTimer: number | undefined;
    let source: EventSource | null = null;

    function startPolling() {
      setConnection("已回退轮询");
      pollTimer = window.setInterval(async () => {
        try {
          if (!stopped) setItems(await api.runLogs(activeRunId));
        } catch {
          setConnection("连接失败");
        }
      }, 2000);
    }

    try {
      source = new EventSource(`${API_BASE}/api/runs/${activeRunId}/logs/stream`);
      setConnection("实时连接中");
      source.addEventListener("log", (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as AgentLog;
        setItems((current) => current.some((item) => item.id === parsed.id) ? current : [...current, parsed]);
      });
      source.addEventListener("completed", () => {
        setConnection("已完成");
        source?.close();
      });
      source.onerror = () => {
        source?.close();
        if (!stopped) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      stopped = true;
      source?.close();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [runId, isRunning]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>实时日志连接状态</span>
        <Badge variant={connectionVariant(connection)}>{connection}</Badge>
      </div>
      <div className="flex max-h-[520px] flex-col gap-2 overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
        {items.map((log) => (
          <div key={log.id} className={`grid gap-1 rounded border p-2 ${levelClass(log.level)}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={levelVariant(log.level)}>{log.level}</Badge>
              <span className="text-slate-400">{formatDate(log.timestamp)}</span>
              <span className="text-slate-400">{log.agent_id}</span>
              {log.run_id && <span className="text-slate-500">run #{log.run_id}</span>}
            </div>
            <pre className="whitespace-pre-wrap break-words leading-5">{log.message}</pre>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-4 text-center text-slate-400">
            {isRunning ? "运行中，等待第一条日志..." : "暂无日志"}
          </div>
        )}
      </div>
    </div>
  );
}
