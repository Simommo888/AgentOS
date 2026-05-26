# Agent 配置规范

## config_json

用于保存 Agent 自身运行参数。

```json
{
  "limit": 10,
  "people_limit": 5,
  "scan_dirs": ["00_Inbox", "09_Prompts"]
}
```

## tools_json

用于保存工具权限列表。

```json
["filesystem", "obsidian", "llm"]
```

## workflow_json

用于流程图展示。

```json
{
  "nodes": [
    {
      "id": "sources",
      "name": "Sources",
      "type": "source",
      "status": "ready",
      "description": "Collect input sources."
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "sources",
      "target": "summary"
    }
  ]
}
```

第一版 workflow 只用于展示，后续可扩展为拖拽编排和保存。
