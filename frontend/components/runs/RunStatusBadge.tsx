"use client";

import { Badge } from "@/components/ui/badge";

export function runStatusVariant(status: string) {
  if (status === "success") return "success";
  if (status === "failed") return "destructive";
  if (status === "cancelled") return "warning";
  if (status === "running") return "default";
  if (status === "pending") return "muted";
  return "secondary";
}

export function runStatusLabel(status: string) {
  if (status === "pending") return "等待中";
  if (status === "running") return "执行中";
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  if (status === "cancelled") return "已取消";
  return status;
}

export function RunStatusBadge({ status }: { status: string }) {
  return <Badge variant={runStatusVariant(status)}>{runStatusLabel(status)}</Badge>;
}
