import { Bell, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-7">
      <div className="flex flex-col">
        <span className="text-sm font-semibold">AgentOS 控制台</span>
        <span className="text-xs text-muted-foreground">统一注册、运行、调度和沉淀你的个人 Agent</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Search">
          <Search data-icon="inline-start" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell data-icon="inline-start" />
        </Button>
      </div>
    </header>
  );
}
