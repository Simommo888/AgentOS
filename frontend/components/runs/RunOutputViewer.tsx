"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RunOutput } from "@/lib/types";

const tabs = [
  { key: "stdout", label: "stdout", empty: "暂无 stdout" },
  { key: "stderr", label: "stderr", empty: "暂无 stderr" },
  { key: "output_summary", label: "summary", empty: "暂无摘要" },
  { key: "error_message", label: "error", empty: "暂无错误" }
] as const;

export function RunOutputViewer({ output }: { output: RunOutput }) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("stdout");
  const [expanded, setExpanded] = useState(false);
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0];
  const value = output[active] || "";
  const visible = useMemo(() => {
    if (expanded || value.length <= 4000) return value;
    return `${value.slice(0, 4000)}\n\n... output truncated in view ...`;
  }, [expanded, value]);

  async function copy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={active === tab.key ? "default" : "outline"}
              onClick={() => setActive(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {value.length > 4000 && (
            <Button size="sm" variant="outline" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "折叠" : "展开"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => copy()} disabled={!value}>
            <Copy data-icon="inline-start" />
            复制
          </Button>
        </div>
      </div>
      <pre className="max-h-[520px] overflow-auto rounded-md border bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">
        {visible || activeTab.empty}
      </pre>
    </div>
  );
}
