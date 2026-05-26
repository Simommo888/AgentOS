"use client";

import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Bot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WorkflowNodeData } from "@/lib/types";

export function AgentNode({ data }: NodeProps) {
  const node = data as WorkflowNodeData;
  return (
    <div className="w-48 rounded-lg border bg-white p-3 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-primary" />
        <span className="truncate text-sm font-semibold">{node.name}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Badge variant="secondary">{node.type}</Badge>
        <Badge variant="success">{node.status}</Badge>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
