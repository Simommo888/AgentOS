"use client";

import { useEffect, useMemo, useState } from "react";

import { RunLogViewer } from "@/components/runs/RunLogViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AgentLog } from "@/lib/types";

export default function LogsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agent, setAgent] = useState("all");
  const [level, setLevel] = useState("all");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.logs().then(setLogs).catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      api.logs().then(setLogs).catch((error) => setMessage(error.message));
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const agentIds = useMemo(() => Array.from(new Set(logs.map((log) => log.agent_id))), [logs]);
  const filtered = logs.filter((log) => {
    const dateMatched = !date || new Date(log.timestamp).toISOString().slice(0, 10) === date;
    return (agent === "all" || log.agent_id === agent) && (level === "all" || log.level === level) && dateMatched;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Logs</h1>
        <p className="text-sm text-muted-foreground">按 Agent、日期和日志级别筛选关键运行步骤、stderr 和错误信息。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={agent} onChange={(event) => setAgent(event.target.value)}>
            <option value="all">全部 Agent</option>
            {agentIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </Select>
          <Select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="all">全部级别</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </Select>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </CardContent>
      </Card>
      <RunLogViewer logs={filtered} />
    </div>
  );
}
