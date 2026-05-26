"use client";

import Link from "next/link";
import { Edit, Eye, Power } from "lucide-react";

import { RunAgentButton } from "@/components/agents/RunAgentButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function runVariant(status: string) {
  if (status === "success") return "success";
  if (status === "failed") return "destructive";
  if (status === "running") return "warning";
  return "muted";
}

export function AgentTable({
  agents,
  onChanged,
  onMessage
}: {
  agents: Agent[];
  onChanged: () => void;
  onMessage: (message: string) => void;
}) {
  async function toggle(agent: Agent) {
    const next = agent.status === "enabled" ? api.disableAgent(agent.id) : api.enableAgent(agent.id);
    await next;
    onMessage(`${agent.name} 已${agent.status === "enabled" ? "禁用" : "启用"}`);
    onChanged();
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">名称</th>
              <th className="px-4 py-3 text-left font-medium">类型</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">上次运行</th>
              <th className="px-4 py-3 text-left font-medium">输出目录</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-t align-top">
                <td className="max-w-md px-4 py-3">
                  <div className="font-medium">{agent.name}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{agent.description}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{agent.type}</td>
                <td className="px-4 py-3">
                  <Badge variant={agent.status === "enabled" ? "success" : "muted"}>{agent.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge variant={runVariant(agent.last_run_status)}>{agent.last_run_status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(agent.last_run_at)}</span>
                  </div>
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{agent.output_path}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <RunAgentButton agentId={agent.id} onDone={(message) => { onMessage(message); onChanged(); }} />
                    <Button asChild size="icon" variant="outline" aria-label="View detail">
                      <Link href={`/agents/${agent.id}`}>
                        <Eye data-icon="inline-start" />
                      </Link>
                    </Button>
                    <Button asChild size="icon" variant="outline" aria-label="Edit config">
                      <Link href={`/agents/${agent.id}`}>
                        <Edit data-icon="inline-start" />
                      </Link>
                    </Button>
                    <Button size="icon" variant="outline" aria-label="Toggle agent" onClick={() => toggle(agent)}>
                      <Power data-icon="inline-start" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                  没有匹配的 Agent
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
