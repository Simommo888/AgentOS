"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Prompt } from "@/lib/types";
import { formatDate, parseJson } from "@/lib/utils";

export function PromptList({
  prompts,
  onEdit,
  onDelete
}: {
  prompts: Prompt[];
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Title</th>
            <th className="px-4 py-3 text-left font-medium">Agent</th>
            <th className="px-4 py-3 text-left font-medium">Scenario</th>
            <th className="px-4 py-3 text-left font-medium">Tags</th>
            <th className="px-4 py-3 text-left font-medium">Updated</th>
            <th className="px-4 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {prompts.map((prompt) => (
            <tr key={prompt.id} className="border-t align-top">
              <td className="max-w-sm px-4 py-3">
                <div className="font-medium">{prompt.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{prompt.content}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{prompt.agent_id ?? "-"}</td>
              <td className="px-4 py-3 text-muted-foreground">{prompt.scenario}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {parseJson<string[]>(prompt.tags_json, []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(prompt.updated_at)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(prompt)}>编辑</Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(prompt.id)}>删除</Button>
                </div>
              </td>
            </tr>
          ))}
          {prompts.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">暂无 Prompt</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
