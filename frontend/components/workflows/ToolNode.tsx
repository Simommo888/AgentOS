"use client";

import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { WorkflowNodeData } from "@/lib/types";

export function ToolNode({ data }: NodeProps) {
  const node = data as WorkflowNodeData;
  return (
    <div className="w-48 rounded-lg border border-indigo-100 bg-indigo-50 p-3 shadow-sm">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <Wrench className="size-4 text-indigo-700" />
        <span className="truncate text-sm font-semibold">{node.name}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Badge variant="outline">{node.type}</Badge>
        <Badge variant="secondary">{node.status}</Badge>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
