"use client";

import { useState } from "react";
import { Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

export function CancelRunButton({
  runId,
  disabled = false,
  onCancelled
}: {
  runId: number;
  disabled?: boolean;
  onCancelled?: (run: AgentRun) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!window.confirm("确定要取消这个正在运行的 Agent 吗？")) return;
    setBusy(true);
    try {
      const run = await api.cancelRun(runId);
      onCancelled?.(run);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={cancel} disabled={disabled || busy}>
      <Square data-icon="inline-start" />
      {busy ? "取消中" : "取消运行"}
    </Button>
  );
}
