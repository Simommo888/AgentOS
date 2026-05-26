import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KnowledgeAsset, RecentFile } from "@/lib/types";

export function KnowledgeAssets({ assets, recent }: { assets: KnowledgeAsset[]; recent: RecentFile[] }) {
  const items = assets.length > 0 ? assets.slice(0, 6) : recent.slice(0, 6);
  return (
    <Card>
      <CardHeader>
        <CardTitle>今日知识资产</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={`${item.file_path}-${index}`} className="flex items-start gap-3 rounded-md border p-3">
            <FileText className="mt-0.5 size-4 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.title}</div>
              <div className="truncate text-xs text-muted-foreground">{item.file_path}</div>
              <div className="mt-1 text-xs text-muted-foreground">建议沉淀：{item.suggested_location}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">暂无输出文件</p>}
      </CardContent>
    </Card>
  );
}
