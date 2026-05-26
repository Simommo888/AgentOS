"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.settings().then(setSettings).catch((error) => setMessage(error.message));
  }, []);

  async function save() {
    if (!settings) return;
    const saved = await api.updateSettings(settings);
    setSettings(saved);
    setMessage("设置已保存");
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  if (!settings) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">正在加载设置...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">配置知识库路径、Python 路径、默认输出目录和环境变量说明。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>基础配置</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>知识库根目录</Label>
              <Input value={settings.knowledge_base_root} onChange={(event) => update("knowledge_base_root", event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Python 路径</Label>
              <Input value={settings.python_path} onChange={(event) => update("python_path", event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>默认输出目录</Label>
              <Input value={settings.default_output_dir} onChange={(event) => update("default_output_dir", event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>LLM Provider 名称</Label>
              <Input value={settings.llm_provider} onChange={(event) => update("llm_provider", event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>数据库</Label>
              <Input value={settings.database_url} disabled />
            </div>
            <Button onClick={() => save().catch((error) => setMessage(error.message))}>保存设置</Button>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>需要配置的环境变量</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {settings.required_env.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>安全说明</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {settings.security_notes.map((note) => <div key={note} className="rounded-md border p-3">{note}</div>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
