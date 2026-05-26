"use client";

import Link from "next/link";

import { CancelRunButton } from "@/components/runs/CancelRunButton";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { Button } from "@/components/ui/button";
import type { Agent, AgentRun } from "@/lib/types";
import { formatDate, parseJson } from "@/lib/utils";

export function RunTable({
  runs,
  agents = [],
  selectedId,
  onChanged,
  onSelect
}: {
  runs: AgentRun[];
  agents?: Agent[];
  selectedId?: number | null;
  onChanged?: () => void;
  onSelect: (run: AgentRun) => void;
}) {
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Run</th>
              <th className="px-4 py-3 text-left font-medium">Agent</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Started</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Retry</th>
              <th className="px-4 py-3 text-left font-medium">Timeout</th>
              <th className="px-4 py-3 text-left font-medium">Files</th>
              <th className="px-4 py-3 text-left font-medium">Cost</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const files = parseJson<string[]>(run.output_files_json, []);
              const active = run.status === "running" || run.status === "pending";
              return (
                <tr key={run.id} className={`border-t align-top ${selectedId === run.id ? "bg-muted/50" : ""}`}>
                  <td className="px-4 py-3 font-medium">#{run.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{agentNames.get(run.agent_id) ?? run.agent_id}</div>
                    <div className="text-xs text-muted-foreground">{run.agent_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RunStatusBadge status={run.status} />
                    {active && <div className="mt-1 text-xs text-blue-700">后台执行中</div>}
                    {run.error_message && <div className="mt-2 line-clamp-2 text-xs text-red-700">{run.error_message}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(run.started_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{run.duration_seconds ? `${run.duration_seconds.toFixed(1)}s` : "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">#{run.retry_count ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{run.timeout_seconds ? `${run.timeout_seconds}s` : "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{files.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(run.estimated_cost || 0).toFixed(6)} {run.cost_currency || "USD"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onSelect(run)}>日志</Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/runs/${run.id}`}>详情</Link>
                      </Button>
                      {active && <CancelRunButton runId={run.id} onCancelled={onChanged} />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={10}>暂无运行记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
