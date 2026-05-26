"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

export function AgentConfigForm({ agent, onSaved }: { agent: Agent; onSaved: (agent: Agent) => void }) {
  const [form, setForm] = useState(agent);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Agent>(key: K, value: Agent[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await api.updateAgent(agent.id, form);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label>名称</Label>
        <Input value={form.name} onChange={(event) => update("name", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>类型</Label>
        <Select value={form.type} onChange={(event) => update("type", event.target.value)}>
          <option value="manual">manual</option>
          <option value="scheduled">scheduled</option>
          <option value="review">review</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>描述</Label>
        <Textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Entrypoint</Label>
        <Input value={form.entrypoint} onChange={(event) => update("entrypoint", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>输出目录</Label>
        <Input value={form.output_path} onChange={(event) => update("output_path", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label>Command</Label>
        <Input value={form.command} onChange={(event) => update("command", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Schedule</Label>
        <Input value={form.schedule} onChange={(event) => update("schedule", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
          <option value="enabled">enabled</option>
          <option value="disabled">disabled</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>config_json</Label>
        <Textarea value={form.config_json} onChange={(event) => update("config_json", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>tools_json</Label>
        <Textarea value={form.tools_json} onChange={(event) => update("tools_json", event.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button onClick={save} disabled={saving}>{saving ? "保存中" : "保存配置"}</Button>
      </div>
    </div>
  );
}
