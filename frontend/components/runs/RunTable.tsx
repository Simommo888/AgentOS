"use client";

import { CancelRunButton } from "@/components/runs/CancelRunButton";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { Button } from "@/components/ui/button";
import type { AgentRun } from "@/lib/types";
import { formatDate, parseJson } from "@/lib/utils";

export function RunTable({
  runs,
  selectedId,
  onChanged,
  onSelect
}: {
  runs: AgentRun[];
  selectedId?: number | null;
  onChanged?: () => void;
  onSelect: (run: AgentRun) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Run</th>
              <th className="px-4 py-3 text-left font-medium">Agent</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">开始时间</th>
              <th className="px-4 py-3 text-left font-medium">结束时间</th>
              <th className="px-4 py-3 text-left font-medium">耗时</th>
              <th className="px-4 py-3 text-left font-medium">结果摘要</th>
              <th className="px-4 py-3 text-left font-medium">输出文件</th>
              <th className="px-4 py-3 text-right font-medium">日志</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const files = parseJson<string[]>(run.output_files_json, []);
              const active = run.status === "running" || run.status === "pending";
              return (
                <tr key={run.id} className={`border-t align-top ${selectedId === run.id ? "bg-muted/50" : ""}`}>
                  <td className="px-4 py-3 font-medium">#{run.id}</td>
                  <td className="px-4 py-3">{run.agent_id}</td>
                  <td className="px-4 py-3">
                    <RunStatusBadge status={run.status} />
                    {active && <div className="mt-1 text-xs text-amber-700">后台执行中</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(run.started_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(run.finished_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{run.duration_seconds ? `${run.duration_seconds.toFixed(1)}s` : "-"}</td>
                  <td className="max-w-sm px-4 py-3">
                    <div className="line-clamp-2 text-muted-foreground">{run.output_summary || (active ? "等待运行结果..." : "-")}</div>
                    {run.error_message && (
                      <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                        {run.error_message}
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {files.length > 0 ? files.map((file) => (
                        <span key={file} className="truncate text-xs text-muted-foreground">{file}</span>
                      )) : <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onSelect(run)}>查看日志</Button>
                      {active && <CancelRunButton runId={run.id} onCancelled={onChanged} />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>暂无运行记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
