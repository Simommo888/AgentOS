"use client";

import { Clock, ListChecks, XCircle, CheckCircle2 } from "lucide-react";

import { CancelRunButton } from "@/components/runs/CancelRunButton";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunQueue as RunQueueType, RunQueueItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function elapsedSeconds(item: RunQueueItem) {
  if (item.duration_seconds) return item.duration_seconds;
  return Math.max(0, (Date.now() - new Date(item.started_at).getTime()) / 1000);
}

function QueueRunRow({
  item,
  onSelect,
  onChanged
}: {
  item: RunQueueItem;
  onSelect: (runId: number) => void;
  onChanged: () => void;
}) {
  const cancellable = item.status === "running" || item.status === "pending";
  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">#{item.run_id}</span>
          <span className="text-sm">{item.agent_name || item.agent_id}</span>
          <RunStatusBadge status={item.status} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          started {formatDate(item.started_at)} · {elapsedSeconds(item).toFixed(0)}s
        </div>
        {item.error_message && <div className="mt-2 text-xs text-red-700">{item.error_message}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onSelect(item.run_id)}>查看日志</Button>
        {cancellable && <CancelRunButton runId={item.run_id} onCancelled={onChanged} />}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Clock }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export function RunQueue({
  queue,
  onSelect,
  onChanged
}: {
  queue: RunQueueType | null;
  onSelect: (runId: number) => void;
  onChanged: () => void;
}) {
  const running = queue?.running_runs ?? [];
  const pending = queue?.pending_runs ?? [];
  const finished = queue?.recently_finished_runs ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>运行队列</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="当前活跃" value={queue?.active_count ?? 0} icon={Clock} />
          <Stat label="等待中" value={queue?.pending_count ?? 0} icon={ListChecks} />
          <Stat label="今日成功" value={queue?.success_count_today ?? 0} icon={CheckCircle2} />
          <Stat label="今日失败" value={queue?.failed_count_today ?? 0} icon={XCircle} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">正在运行</div>
            {running.map((item) => (
              <QueueRunRow key={item.run_id} item={item} onSelect={onSelect} onChanged={onChanged} />
            ))}
            {running.length === 0 && <div className="rounded-md border p-3 text-sm text-muted-foreground">当前没有正在运行的任务。</div>}
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium">等待与最近完成</div>
            {[...pending, ...finished.slice(0, 4)].map((item) => (
              <QueueRunRow key={item.run_id} item={item} onSelect={onSelect} onChanged={onChanged} />
            ))}
            {pending.length === 0 && finished.length === 0 && <div className="rounded-md border p-3 text-sm text-muted-foreground">暂无队列记录。</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
