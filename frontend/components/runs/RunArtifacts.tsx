"use client";

import { Copy, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RunArtifact } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function formatSize(size: number) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  return `${Math.ceil(size / 1024)} KB`;
}

export function RunArtifacts({ artifacts }: { artifacts: RunArtifact[] }) {
  async function copyPath(path: string) {
    await navigator.clipboard.writeText(path);
  }

  return (
    <div className="flex flex-col gap-3">
      {artifacts.map((artifact) => (
        <div key={artifact.file_path} className="rounded-md border p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="font-medium">{artifact.title}</span>
                <Badge variant={artifact.file_exists ? "success" : "warning"}>
                  {artifact.file_exists ? "exists" : "missing"}
                </Badge>
                <Badge variant="secondary">{artifact.asset_type}</Badge>
              </div>
              <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{artifact.file_path}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{formatSize(artifact.file_size)}</span>
                <span>{artifact.modified_at ? formatDate(new Date(artifact.modified_at * 1000).toISOString()) : "-"}</span>
              </div>
              {artifact.warning && <p className="mt-2 text-xs text-amber-700">{artifact.warning}</p>}
            </div>
            <Button size="sm" variant="outline" onClick={() => copyPath(artifact.file_path)}>
              <Copy data-icon="inline-start" />
              复制路径
            </Button>
          </div>
          <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {artifact.preview || "暂无预览"}
          </pre>
        </div>
      ))}
      {artifacts.length === 0 && (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">本次运行暂无输出文件。</div>
      )}
    </div>
  );
}
