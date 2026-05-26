"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

const dangerousPatterns = [/&&/, /\|\|/, /;/, /\|/, />/, /</, /`/, /\$\(/, /\brm\b/i, /\bdel\b/i, /\bformat\b/i, /\bshutdown\b/i];

function commandWarning(command: string) {
  if (dangerousPatterns.some((pattern) => pattern.test(command))) {
    return "Command 包含疑似 shell 拼接或危险命令。AgentOS 不允许直接保存这类命令，请改成安全的 Python entrypoint 参数形式。";
  }
  return "";
}

export function AgentConfigForm({ agent, onSaved }: { agent: Agent; onSaved: (agent: Agent) => void }) {
  const [form, setForm] = useState(agent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const warning = useMemo(() => commandWarning(form.command), [form.command]);

  function update<K extends keyof Agent>(key: K, value: Agent[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setMessage("");
    if (warning) {
      setMessage(warning);
      return;
    }
    setSaving(true);
    try {
      const saved = await api.updateAgent(agent.id, {
        name: form.name,
        description: form.description,
        status: form.status,
        command: form.command,
        schedule: form.schedule,
        output_path: form.output_path,
        timeout_seconds: form.timeout_seconds,
        retry_enabled: form.retry_enabled,
        max_retries: form.max_retries,
        retry_delay_seconds: form.retry_delay_seconds,
        config_json: form.config_json,
        tools_json: form.tools_json
      });
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {message && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 md:col-span-2">{message}</div>}
      <div className="flex flex-col gap-2">
        <Label>名称</Label>
        <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="enabled">enabled</option>
          <option value="disabled">disabled</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>描述</Label>
        <Textarea rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Command</Label>
        <Input value={form.command} onChange={(event) => update("command", event.target.value)} />
        {warning && <div className="text-xs text-amber-700">{warning}</div>}
      </div>
      <div className="flex flex-col gap-2">
        <Label>Schedule</Label>
        <Input value={form.schedule} onChange={(event) => update("schedule", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>输出目录</Label>
        <Input value={form.output_path} onChange={(event) => update("output_path", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Timeout seconds</Label>
        <Input
          type="number"
          min={1}
          value={form.timeout_seconds}
          onChange={(event) => update("timeout_seconds", Number(event.target.value))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Retry enabled</Label>
        <Select value={form.retry_enabled ? "true" : "false"} onChange={(event) => update("retry_enabled", event.target.value === "true")}>
          <option value="false">false</option>
          <option value="true">true</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Max retries</Label>
        <Input type="number" min={0} value={form.max_retries} onChange={(event) => update("max_retries", Number(event.target.value))} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Retry delay seconds</Label>
        <Input type="number" min={0} value={form.retry_delay_seconds} onChange={(event) => update("retry_delay_seconds", Number(event.target.value))} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>config_json</Label>
        <Textarea rows={8} value={form.config_json} onChange={(event) => update("config_json", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>tools_json</Label>
        <Textarea rows={8} value={form.tools_json} onChange={(event) => update("tools_json", event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button onClick={save} disabled={saving || Boolean(warning)}>{saving ? "保存中..." : "保存配置"}</Button>
      </div>
    </div>
  );
}
