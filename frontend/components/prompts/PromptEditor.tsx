"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Prompt } from "@/lib/types";

const emptyPrompt: Partial<Prompt> = {
  title: "",
  agent_id: "",
  scenario: "",
  content: "",
  tags_json: "[]"
};

export function PromptEditor({
  agents,
  prompt,
  onSave
}: {
  agents: Agent[];
  prompt?: Prompt | null;
  onSave: (payload: Partial<Prompt>) => void;
}) {
  const [form, setForm] = useState<Partial<Prompt>>(prompt ?? emptyPrompt);

  useEffect(() => {
    setForm(prompt ?? emptyPrompt);
  }, [prompt]);

  function update<K extends keyof Prompt>(key: K, value: Prompt[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Title</Label>
        <Input value={form.title ?? ""} onChange={(event) => update("title", event.target.value)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Agent</Label>
          <Select value={form.agent_id ?? ""} onChange={(event) => update("agent_id", event.target.value)}>
            <option value="">未关联</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Scenario</Label>
          <Input value={form.scenario ?? ""} onChange={(event) => update("scenario", event.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Content</Label>
        <Textarea className="min-h-56" value={form.content ?? ""} onChange={(event) => update("content", event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Tags JSON</Label>
        <Input value={form.tags_json ?? "[]"} onChange={(event) => update("tags_json", event.target.value)} />
      </div>
      <Button onClick={() => onSave(form)}>{prompt ? "保存 Prompt" : "新建 Prompt"}</Button>
    </div>
  );
}
