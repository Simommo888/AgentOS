"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import type { KnowledgeAsset, RecentFile } from "@/lib/types";

type KbConfig = {
  knowledge_base_root: string;
  categories: Record<string, string>;
  default_output_dir: string;
  excluded_dirs?: string[];
  excluded_files?: string[];
};

const categoryOptions = [
  { label: "全部", value: "all" },
  { label: "AI News", value: "AI News" },
  { label: "People Watch", value: "People Watch" },
  { label: "AgentOS", value: "AgentOS" },
  { label: "Permanent Notes", value: "Permanent Notes" },
  { label: "Business Ideas", value: "Business Ideas" },
  { label: "Prompts", value: "Prompts" },
  { label: "Error Fixes", value: "Error Fixes" }
];

function AssetRow({ item, onOpen }: { item: KnowledgeAsset | RecentFile; onOpen: (path: string) => void }) {
  const missing = item.file_exists === false;
  const empty = item.is_empty === true || item.file_empty === true;
  const size = item.file_size ?? 0;
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{item.title}</div>
          <div className="truncate text-xs text-muted-foreground">{item.file_path}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{item.asset_type}</Badge>
            <Badge variant="outline">{item.suggested_location}</Badge>
            {size > 0 && <Badge variant="muted">{Math.ceil(size / 1024)} KB</Badge>}
            {empty && <Badge variant="warning">空文件</Badge>}
            {missing && <Badge variant="destructive">无法读取</Badge>}
          </div>
          {item.warning && <p className="mt-2 text-xs text-amber-700">{item.warning}</p>}
          {missing && <p className="mt-2 text-xs text-red-700">文件路径已记录，但当前文件不存在或无法读取。</p>}
          {empty && <p className="mt-2 text-xs text-amber-700">文件存在但内容为空，请检查 Agent 输出。</p>}
          {"preview" in item && item.preview && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.preview}</p>}
        </div>
        <Button size="icon" variant="outline" onClick={() => onOpen(item.file_path)} aria-label="Open file">
          <FolderOpen data-icon="inline-start" />
        </Button>
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [config, setConfig] = useState<KbConfig | null>(null);
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [recent, setRecent] = useState<RecentFile[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const params = { category, search, limit: 50 };
    const [configData, assetData, recentData] = await Promise.all([
      api.kbConfig(),
      api.assets(params),
      api.recentFiles(params)
    ]);
    setConfig(configData);
    setAssets(assetData);
    setRecent(recentData);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((error) => setMessage(error.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [category, search]);

  const aiDaily = useMemo(
    () => recent.filter((item) => item.file_path.includes("04_Resources/AI-News/Daily")),
    [recent]
  );
  const peopleWatch = useMemo(
    () => recent.filter((item) => item.file_path.includes("04_Resources/AI-News/People-Watch")),
    [recent]
  );
  const agentosOutputs = useMemo(
    () => assets.filter((item) => item.file_path.includes("04_Resources/AgentOS")),
    [assets]
  );

  function openPath(path: string) {
    const root = config?.knowledge_base_root ?? "";
    const fullPath = path.includes(":") ? path : `${root}\\${path}`;
    window.open(`file:///${fullPath.replaceAll("\\", "/")}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">快速查看 Agent 输出、AI 情报日报和最近生成的 Markdown 文件。</p>
      </div>
      {message && <div className="rounded-md border bg-white px-4 py-3 text-sm text-muted-foreground">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索日报、Agent 输出或路径" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Obsidian 知识库路径</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">{config?.knowledge_base_root ?? "-"}</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(config?.categories ?? {}).map(([name, path]) => (
              <div key={name} className="rounded-md border bg-white p-3">
                <div className="font-medium">{name}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{path}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            已排除：{(config?.excluded_dirs ?? []).join(", ")}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>AI 情报日报</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {aiDaily.slice(0, 8).map((item) => <AssetRow key={item.file_path} item={item} onOpen={openPath} />)}
            {aiDaily.length === 0 && <p className="text-sm text-muted-foreground">暂无匹配的 AI 情报日报。</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI 大佬动态</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {peopleWatch.slice(0, 8).map((item) => <AssetRow key={item.file_path} item={item} onOpen={openPath} />)}
            {peopleWatch.length === 0 && <p className="text-sm text-muted-foreground">暂无匹配的 People Watch 输出。</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AgentOS 输出</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {agentosOutputs.slice(0, 8).map((asset) => <AssetRow key={asset.id} item={asset} onOpen={openPath} />)}
            {agentosOutputs.length === 0 && <p className="text-sm text-muted-foreground">暂无匹配的 AgentOS 输出。</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent 输出目录索引</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {assets.map((asset) => <AssetRow key={asset.id} item={asset} onOpen={openPath} />)}
            {assets.length === 0 && <p className="text-sm text-muted-foreground">没有匹配的输出文件索引。</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>最近生成的 Markdown 文件</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recent.map((file) => <AssetRow key={file.file_path} item={file} onOpen={openPath} />)}
            {recent.length === 0 && <p className="text-sm text-muted-foreground">没有匹配的最近文件。</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
