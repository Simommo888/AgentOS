"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler
} from "@xyflow/react";

import { AgentNode } from "@/components/workflows/AgentNode";
import { OutputNode } from "@/components/workflows/OutputNode";
import { ToolNode } from "@/components/workflows/ToolNode";
import type { WorkflowDefinition, WorkflowNodeData } from "@/lib/types";

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  output: OutputNode
};

function nodeType(type: string) {
  if (type === "output") return "output";
  if (type === "source" || type === "llm" || type === "process") return "tool";
  return "agent";
}

export function WorkflowCanvas({ workflow }: { workflow: WorkflowDefinition }) {
  const [selected, setSelected] = useState<WorkflowNodeData | null>(workflow.nodes[0] ?? null);
  const nodes = useMemo<Node[]>(() => {
    return workflow.nodes.map((node, index) => ({
      id: node.id,
      type: nodeType(node.type),
      position: {
        x: (index % 4) * 260,
        y: Math.floor(index / 4) * 150
      },
      data: node
    }));
  }, [workflow]);

  const edges = useMemo<Edge[]>(() => {
    return workflow.edges.map((edge) => ({
      ...edge,
      animated: true,
      style: { stroke: "#0f766e", strokeWidth: 1.6 }
    }));
  }, [workflow]);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    setSelected(node.data as WorkflowNodeData);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="h-[520px] overflow-hidden rounded-lg border bg-white">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={onNodeClick}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">节点详情</h3>
        {selected ? (
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">名称</div>
              <div className="font-medium">{selected.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">类型</div>
              <div>{selected.type}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">状态</div>
              <div>{selected.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">描述</div>
              <p className="leading-6 text-muted-foreground">{selected.description}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">点击节点查看描述</p>
        )}
      </div>
    </div>
  );
}
