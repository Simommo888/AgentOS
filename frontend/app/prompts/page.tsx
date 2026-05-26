"use client";

import { useEffect, useMemo, useState } from "react";

import { PromptEditor } from "@/components/prompts/PromptEditor";
import { PromptList } from "@/components/prompts/PromptList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Agent, Prompt } from "@/lib/types";

export default function PromptsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [scenario, setScenario] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [agentData, promptData] = await Promise.all([api.agents(), api.prompts()]);
    setAgents(agentData);
    setPrompts(promptData);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const filtered = useMemo(() => prompts.filter((prompt) => (
    (agentFilter === "all" || prompt.agent_id === agentFilter) &&
    (!scenario || prompt.scenario.toLowerCase().includes(scenario.toLowerCase()))
  )), [prompts, agentFilter, scenario]);

  async function save(payload: Partial<Prompt>) {
    if (selected) {
      await api.updatePrompt(selected.id, payload);
      setMessage("Prompt 已保存");
    } else {
      await api.createPrompt(payload);
      setMessage("Prompt 已创建");
    }
    setSelected(null);
    await load();
  }

  async function remove(id: number) {
    await api.deletePrompt(id);
    setMessage("Prompt 已删除");
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Prompts</h1>
        <p className="text-sm text-muted-foreground">管理 Prompt 模板，并按 Agent 和场景关联沉淀。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>筛选</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}>
                <option value="all">全部 Agent</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </Select>
              <Input placeholder="按场景筛选" value={scenario} onChange={(event) => setScenario(event.target.value)} />
            </CardContent>
          </Card>
          <PromptList prompts={filtered} onEdit={setSelected} onDelete={(id) => remove(id).catch((error) => setMessage(error.message))} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{selected ? "编辑 Prompt" : "新建 Prompt"}</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptEditor agents={agents} prompt={selected} onSave={(payload) => save(payload).catch((error) => setMessage(error.message))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
