"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type { Agent, Schedule } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function SchedulesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [agentId, setAgentId] = useState("");
  const [cron, setCron] = useState("0 9 * * *");
  const [message, setMessage] = useState("");

  async function load() {
    const [agentData, scheduleData] = await Promise.all([api.agents(), api.schedules()]);
    setAgents(agentData);
    setSchedules(scheduleData);
    setAgentId(agentData[0]?.id ?? "");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, []);

  async function create() {
    await api.createSchedule({ agent_id: agentId, cron, enabled: true });
    setMessage("定时任务已创建");
    await load();
  }

  async function update(schedule: Schedule, nextCron: string) {
    await api.updateSchedule(schedule.id, { cron: nextCron });
    setMessage("cron 已更新");
    await load();
  }

  async function toggle(schedule: Schedule, enabled: boolean) {
    if (enabled) await api.enableSchedule(schedule.id);
    else await api.disableSchedule(schedule.id);
    await load();
  }

  async function run(schedule: Schedule) {
    const result = await api.runSchedule(schedule.id);
    setMessage(`手动触发完成：${result.status}`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="text-sm text-muted-foreground">查看、创建、启停和手动触发本地 APScheduler cron 任务。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <Card>
        <CardHeader>
          <CardTitle>新建定时任务</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="flex flex-col gap-2">
            <Label>Agent</Label>
            <Select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cron</Label>
            <Input value={cron} onChange={(event) => setCron(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => create().catch((error) => setMessage(error.message))}>创建</Button>
          </div>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Agent</th>
              <th className="px-4 py-3 text-left font-medium">Cron</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-left font-medium">下次运行</th>
              <th className="px-4 py-3 text-left font-medium">上次运行</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="border-t">
                <td className="px-4 py-3 font-medium">{schedule.agent_id}</td>
                <td className="px-4 py-3">
                  <Input defaultValue={schedule.cron} onBlur={(event) => update(schedule, event.target.value).catch((error) => setMessage(error.message))} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={schedule.enabled} onCheckedChange={(checked) => toggle(schedule, checked).catch((error) => setMessage(error.message))} />
                    <Badge variant={schedule.enabled ? "success" : "muted"}>{schedule.enabled ? "enabled" : "disabled"}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(schedule.next_run_at)}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(schedule.last_run_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => run(schedule).catch((error) => setMessage(error.message))}>
                    <Play data-icon="inline-start" />
                    手动触发
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
