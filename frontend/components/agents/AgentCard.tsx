import Link from "next/link";
import { Bot, FolderOpen } from "lucide-react";

import { RunAgentButton } from "@/components/agents/RunAgentButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function AgentCard({ agent, onDone }: { agent: Agent; onDone?: (message: string) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
            <Bot className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold">{agent.name}</h3>
              <Badge variant={agent.status === "enabled" ? "success" : "muted"}>{agent.status}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span>类型</span>
            <span>{agent.type}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>上次运行</span>
            <span>{agent.last_run_status} · {formatDate(agent.last_run_at)}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <FolderOpen className="size-3" />
            <span className="truncate">{agent.output_path}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunAgentButton agentId={agent.id} onDone={onDone} />
          <Button asChild size="sm" variant="outline">
            <Link href={`/agents/${agent.id}`}>查看详情</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
