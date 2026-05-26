"use client";

import { Badge } from "@/components/ui/badge";
import type { AgentLog } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

export function RunLogViewer({ logs, isRunning = false }: { logs: AgentLog[]; isRunning?: boolean }) {
  return (
    <div className="flex max-h-[520px] flex-col gap-2 overflow-auto rounded-md border bg-slate-950 p-3 font-mono text-xs text-slate-100">
      {logs.map((log) => (
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
      {logs.length === 0 && (
        <div className="p-4 text-center text-slate-400">
          {isRunning ? "运行中，等待第一条日志..." : "暂无日志"}
        </div>
      )}
    </div>
  );
}
