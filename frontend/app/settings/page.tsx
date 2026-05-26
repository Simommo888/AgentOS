"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Settings } from "@/lib/types";

function listToText(value: string[]) {
  return value.join("\n");
}

function textToList(value: string) {
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

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

  async function resetScan() {
    const saved = await api.resetKbScanSettings();
    setSettings(saved);
    setMessage("Knowledge Base 扫描规则已恢复默认值");
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
        <p className="text-sm text-muted-foreground">配置运行时、知识库扫描、路径和环境变量说明。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-6">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Runtime Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>max_concurrent_runs</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.max_concurrent_runs}
                  onChange={(event) => update("max_concurrent_runs", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>default_timeout_seconds</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.default_timeout_seconds}
                  onChange={(event) => update("default_timeout_seconds", Number(event.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Scan Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>excluded_dirs</Label>
                <Textarea
                  rows={8}
                  value={listToText(settings.excluded_dirs)}
                  onChange={(event) => update("excluded_dirs", textToList(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>excluded_files</Label>
                <Textarea
                  rows={8}
                  value={listToText(settings.excluded_files)}
                  onChange={(event) => update("excluded_files", textToList(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>max_recent_files</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.max_recent_files}
                  onChange={(event) => update("max_recent_files", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>default_asset_limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.default_asset_limit}
                  onChange={(event) => update("default_asset_limit", Number(event.target.value))}
                />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button onClick={() => save().catch((error) => setMessage(error.message))}>保存设置</Button>
                <Button variant="outline" onClick={() => resetScan().catch((error) => setMessage(error.message))}>恢复默认排除规则</Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
