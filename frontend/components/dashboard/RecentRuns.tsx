import { Badge } from "@/components/ui/badge";
import type { AgentRun } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "success") return "success";
  if (status === "failed") return "destructive";
  if (status === "running") return "warning";
  return "muted";
}

export function RecentRuns({ runs }: { runs: AgentRun[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b p-5">
        <h2 className="text-base font-semibold">最近运行记录</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Agent</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">开始时间</th>
              <th className="px-4 py-3 text-left font-medium">耗时</th>
              <th className="px-4 py-3 text-left font-medium">摘要</th>
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 8).map((run) => (
              <tr key={run.id} className="border-t">
                <td className="px-4 py-3 font-medium">{run.agent_id}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(run.started_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {run.duration_seconds ? `${run.duration_seconds.toFixed(1)}s` : "-"}
                </td>
                <td className="max-w-sm truncate px-4 py-3 text-muted-foreground">{run.output_summary || run.error_message || "-"}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                  暂无运行记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
