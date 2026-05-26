"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Plus } from "lucide-react";

import { AgentCard } from "@/components/agents/AgentCard";
import { AgentTable } from "@/components/agents/AgentTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [message, setMessage] = useState("");

  async function load() {
    setAgents(await api.agents());
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  const types = useMemo(() => Array.from(new Set(agents.map((agent) => agent.type))), [agents]);
  const filtered = agents.filter((agent) => {
    const text = `${agent.name} ${agent.description} ${agent.id}`.toLowerCase();
    return (
      text.includes(query.toLowerCase()) &&
      (status === "all" || agent.status === status) &&
      (type === "all" || agent.type === type)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground">统一查看、运行、启停和编辑所有本地 Agent。</p>
        </div>
        <Button variant="outline">
          <Plus data-icon="inline-start" />
          新建 Agent
        </Button>
      </div>

      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <Input placeholder="搜索 Agent 名称、描述或 id" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="enabled">enabled</option>
            <option value="disabled">disabled</option>
          </Select>
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">全部类型</option>
            {types.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:hidden">
        {filtered.map((agent) => <AgentCard key={agent.id} agent={agent} onDone={(text) => { setMessage(text); load(); }} />)}
      </div>

      <div className="hidden lg:block">
        <AgentTable agents={filtered} onChanged={load} onMessage={setMessage} />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bot className="size-4" />
        当前显示 {filtered.length} / {agents.length} 个 Agent
      </div>
    </div>
  );
}
