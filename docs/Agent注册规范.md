# Agent 注册规范

每个 Agent 必须包含：

- `id`：稳定唯一标识，例如 `ai_news_agent`
- `name`：展示名称
- `description`：用途说明
- `entrypoint`：Python 脚本路径，第一版必须位于 `scripts/` 下
- `command`：执行命令，必须指向注册的 entrypoint
- `output_path`：输出目录，建议位于 Obsidian 知识库内
- `tools`：工具权限列表，例如 `filesystem`、`obsidian`、`llm`
- `schedule`：cron 表达式，可为空
- `config`：Agent 配置 JSON

推荐注册方式：

1. 先把脚本放入 `scripts/`
2. 确认脚本可直接 `python` 运行
3. 确认脚本会输出 Markdown 到 `output_path`
4. 通过 AgentOS API 或 `backend/app/seed.py` 注册
5. 在前端 Agents 页面验证详情和运行结果
