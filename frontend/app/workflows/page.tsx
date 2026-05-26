"use client";

import { useEffect, useMemo, useState } from "react";

import { WorkflowCanvas } from "@/components/workflows/WorkflowCanvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Agent, WorkflowDefinition } from "@/lib/types";
import { parseJson } from "@/lib/utils";

export default function WorkflowsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState("ai_news_agent");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.agents().then((data) => {
      setAgents(data);
      if (!data.find((agent) => agent.id === selectedId) && data[0]) setSelectedId(data[0].id);
    }).catch((error) => setMessage(error.message));
  }, [selectedId]);

  const agent = agents.find((item) => item.id === selectedId);
  const workflow = useMemo<WorkflowDefinition>(() => parseJson(agent?.workflow_json, { nodes: [], edges: [] }), [agent]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <p className="text-sm text-muted-foreground">用 React Flow 查看每个 Agent 的执行流程，预留后续可视化编排能力。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <Card>
        <CardHeader>
          <CardTitle>选择 Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {agents.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
        </CardContent>
      </Card>
      <WorkflowCanvas workflow={workflow} />
    </div>
  );
}
