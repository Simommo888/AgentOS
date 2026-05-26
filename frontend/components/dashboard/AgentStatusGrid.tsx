import { Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function AgentStatusGrid({ agents }: { agents: Agent[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.id}>
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
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{agent.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{agent.type}</span>
              <span>{agent.last_run_status} · {formatDate(agent.last_run_at)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
