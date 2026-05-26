# AgentOS

AgentOS 是一个面向个人开发者的本地 Agent 管理平台，用来统一注册、运行、调度和观察 AI Agent，并把输出沉淀到 Obsidian 知识库。

## 适合管理的 Agent

- AI 情报 Agent
- 知识库整理 Agent
- Prompt 沉淀 Agent
- 报错复盘 Agent
- 项目复盘 Agent
- GitHub 备份 Agent
- 商业机会分析 Agent
- 简历优化 Agent
- RAG 问答 Agent
- Codex 任务拆解 Agent
- Claude Code 审查 Agent

## 系统架构

- 前端：Next.js、React、TypeScript、Tailwind CSS、shadcn/ui 风格组件、React Flow、lucide-react
- 后端：FastAPI、SQLite、SQLAlchemy、Pydantic、APScheduler
- 执行：通过 `subprocess.Popen(shell=False)` 运行已注册的本地 Python Agent
- 队列：本地内存注册表 + SQLite 状态，不依赖 Redis / Celery
- 知识库：默认读取 `D:\My-Knowledge-Base`，索引 Markdown 输出文件

## 功能列表

- Agent 注册、列表、详情、启用、禁用和配置编辑
- 手动运行、后台异步运行、pending 队列、running 状态和运行队列视图
- 进程组级取消、运行超时、失败重试、stale running 修复
- Runs / Logs 查看 stdout、stderr、错误信息、输出摘要和输出文件
- SSE 实时日志流，失败时自动回退轮询
- Prompt 模板、工具权限、定时任务和设置管理
- Knowledge Base 搜索、分类筛选、排除规则配置和输出文件索引
- React Flow 工作流展示
- 预置 `daily_ai_news_agent` 和多个可运行占位 Agent

## 启动后端

```bash
cd agentos/backend
pip install -r requirements.txt
python -m app.seed
uvicorn main:app --reload
```

API 文档：`http://localhost:8000/docs`

## 启动前端

```bash
cd agentos/frontend
npm install
npm run dev
```

控制台：`http://localhost:3000`

## 初始化数据库

```bash
cd agentos/backend
python -m app.seed
```

本地开发版使用轻量 schema upgrade：后端启动时会创建表；如果新增字段不存在，会自动 `ALTER TABLE` 添加，不要求删除现有 SQLite 数据库。

## 注册新 Agent

每个 Agent 至少需要：

- `id`
- `name`
- `description`
- `entrypoint`
- `command`
- `output_path`
- `tools_json`
- `workflow_json`
- `timeout_seconds`
- `retry_enabled`
- `max_retries`
- `retry_delay_seconds`

可以通过 `POST /api/agents` 注册，也可以把默认记录加入 `backend/app/seed.py`。

## 运行 Agent

- 前端：Dashboard 或 Agents 页面点击“立即运行”
- API：`POST /api/agents/{id}/run`

点击运行后，后端会立即创建 `AgentRun(status=pending)` 并返回 `run_id`。调度器根据 `max_concurrent_runs` 决定是否立刻启动；启动后状态变为 `running`，完成后变为 `success`、`failed` 或 `cancelled`。

## 运行队列

打开 `/runs`，顶部“运行队列”会显示：

- 当前运行数
- 最大并发数
- pending 队列
- 今日成功 / 失败数量
- 最近完成任务

当 running 数达到 `max_concurrent_runs`，新任务会保持 `pending`。任一任务结束后，AgentOS 会自动启动下一个 pending run。

## 取消运行

运行中的任务可在 Runs、Agent 详情或日志区域点击“取消运行”。

取消逻辑：

- Windows 下用 `CREATE_NEW_PROCESS_GROUP` 启动子进程，取消时优先发送进程组控制信号，再降级 `terminate -> kill`
- Linux / macOS 下用 `os.setsid` 创建进程组，取消时优先 `os.killpg`
- 只取消 AgentOS 自己启动并登记在本地注册表中的进程
- 取消成功后状态为 `cancelled`，错误信息为 `Run cancelled by user.`

边界：如果 Agent 自己脱离进程组、启动外部守护进程，AgentOS 可能无法完全回收，需要在对应 Agent 内部补充清理逻辑。

## 运行超时

每个 Agent 可配置 `timeout_seconds`，默认使用 Settings 中的 `default_timeout_seconds`，当前默认 1800 秒。超时后 AgentOS 会取消进程组并把 run 标记为 `failed`，错误信息为：

```text
Run timed out after X seconds.
```

选择 `failed` 是为了把 timeout 视为运行异常；如果开启重试，timeout 会按失败重试策略处理。

## 失败重试

Agent 可配置：

- `retry_enabled`
- `max_retries`
- `retry_delay_seconds`

默认不开启重试。开启后，失败 run 会自动创建新的 pending retry run，并在日志和 run 字段中记录 `retry_count` / `parent_run_id`。用户手动取消的任务不会自动重试；重试次数不会超过 `max_retries`。

## SSE 实时日志

实时日志接口：

```text
GET /api/runs/{id}/logs/stream
```

前端 `RunLogViewer` 会优先使用 SSE。running 时持续推送新日志；run 结束后发送 `completed` 事件并关闭连接。如果 SSE 连接失败，前端会自动回退到每 2 秒轮询 `GET /api/runs/{id}/logs`，并显示连接状态。

## stale running 修复

如果后端在 Agent 运行时重启，SQLite 里可能残留 `pending` / `running`。启动时 `repair_stale_runs()` 会把这些记录修复为 `failed`，写入：

```text
AgentOS restarted while this run was active. Marked as stale.
```

同时写入 warning 日志：

```text
Stale running run detected and repaired.
```

## AI 情报 Agent

预置配置：

```text
id: ai_news_agent
entrypoint: scripts/daily_ai_news_agent/daily_ai_news_agent.py
command: python scripts/daily_ai_news_agent/daily_ai_news_agent.py --limit 10 --people-limit 5
schedule: 0 9 * * *
```

命令行验证：

```bash
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --dry-run --verbose
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --no-llm
```

如果 `OPENAI_API_KEY` 不存在，AgentOS 会自动追加 `--no-llm`，使用规则摘要生成 Markdown，不会让平台崩溃。

## 配置 OPENAI_API_KEY

```bash
cd agentos
copy .env.example .env
```

在 `.env` 或当前终端环境中配置：

```text
OPENAI_API_KEY=你的 Key
AI_NEWS_LLM_MODEL=gpt-4.1-mini
AI_NEWS_LLM_BASE_URL=
```

AgentOS 不会在前端、Runs、Logs 或数据库日志里显示 API Key 明文。

## AI 情报输出目录

- 日报：`04_Resources/AI-News/Daily/`
- AI 大佬动态：`04_Resources/AI-News/People-Watch/`
- AgentOS 资产索引：Knowledge Base 页面

失败排查：

- Runs：查看 `status`、`error_message`、`output_summary`、`output_files`
- Logs：按 `ai_news_agent` 过滤，查看关键步骤、stderr 和 error 日志
- Agent 详情：查看健康检查、entrypoint、requirements、输出目录、API Key 状态、timeout / retry 配置

## Knowledge Base 扫描配置

打开 `/settings` 的 “Knowledge Base Scan Settings” 可编辑：

- `excluded_dirs`
- `excluded_files`
- `max_recent_files`
- `default_asset_limit`

可点击“恢复默认排除规则”。

默认排除目录：

```text
node_modules, .next, .git, __pycache__, .venv, venv, env, dist, build,
.pytest_cache, .mypy_cache, .turbo, coverage, .trash
```

默认排除文件：

```text
*.pyc, *.log, *.tmp, package-lock.json, yarn.lock, pnpm-lock.yaml, .obsidian/workspace.json
```

排除这些目录和文件，是为了避免把依赖包、构建产物、缓存和 Git 内部对象当作知识资产扫描，也能显著提升 Knowledge Base 页面加载速度。

## API 摘要

- `GET /api/runs/queue`
- `POST /api/runs/{id}/cancel`
- `GET /api/runs/{id}/logs/stream`
- `GET /api/runs/{id}`
- `GET /api/runs/{id}/artifacts`
- `GET /api/agents/{id}/metrics`
- `GET /api/metrics/overview`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/settings/knowledge-base/reset-scan`
- `GET /api/knowledge-base/assets?category=AI-News&search=日报`
- `GET /api/knowledge-base/recent?limit=50`

## Run 详情与观测指标

打开 `/runs` 后，每条运行记录都有“详情”入口，跳转到：

```text
/runs/{run_id}
```

Run 详情页展示：

- 基本信息：状态、所属 Agent、开始时间、结束时间、耗时、命令
- 可靠性信息：`retry_count`、`parent_run_id`、`timeout_seconds`、`cancelled_by`
- LLM 预留字段：`llm_provider`、`llm_model`、`prompt_tokens`、`completion_tokens`、`total_tokens`
- 成本预留字段：`estimated_cost`、`cost_currency`
- 输出查看：stdout、stderr、output_summary、error_message
- 输出文件：文件名、路径、大小、修改时间、Markdown 预览、缺失 warning
- KnowledgeAsset 列表
- 日志流：running 时使用 SSE，完成后显示完整日志

这些 LLM 和成本字段当前是预留字段。AI 情报 Agent 在 `--no-llm` 模式下不会产生 token 或成本统计，因此默认显示 0。后续接入真实 LLM 调用计量后，可以在 Agent Runner 或具体 Agent 输出 metadata 中写入这些字段。

## Dashboard 观测指标

Dashboard 通过 `GET /api/metrics/overview` 展示全局运行情况：

- 今日运行次数
- 今日成功数
- 今日失败数
- 当前 running / pending 数
- 总生成知识资产数
- 平均耗时
- 最近 7 天成功率
- 最近失败 Run 列表
- 最常用 Agent 列表
- 总 token 和成本预留

## Agent 运行指标

Agent 详情页通过 `GET /api/agents/{id}/metrics` 展示：

- 总运行次数
- 成功数、失败数、取消数、timeout 数
- 成功率、失败率
- 平均耗时
- 最近 7 天运行数和成功率
- 总生成资产数
- 总 token 和成本预留
- 最近失败原因
- 最近输出文件

## stdout / stderr 查看

Run 详情页的 stdout / stderr 查看器支持：

- stdout / stderr / summary / error 分 tab 查看
- 长文本折叠和展开
- 一键复制
- 空内容友好提示

## 编辑 timeout / retry

Agent 详情页的配置表单可以编辑：

- `name`
- `description`
- `status`
- `command`
- `schedule`
- `output_path`
- `timeout_seconds`
- `retry_enabled`
- `max_retries`
- `retry_delay_seconds`
- `config_json`
- `tools_json`

前端会拦截疑似危险 shell 字符，例如 `&&`、`||`、`;`、管道、重定向、反引号和常见危险命令。API Key 不会出现在配置表单中。

## 安全边界

- 不执行未注册命令
- entrypoint 必须在允许目录内
- 默认 `shell=False`
- API Key 只从环境变量读取，不打印到日志
- 不删除知识库文件
- 不自动 push GitHub
- 不做用户登录、多租户或云端部署

## 当前限制

- 本地单进程队列，服务重启后内存注册表会丢失，依赖 stale 修复数据库状态
- 取消能力受操作系统和 Agent 子进程行为影响
- SSE 是轻量实时日志，不提供断点续传协议
- retry 是简单失败重试，不做指数退避或失败分类
- LLM token 和成本字段当前只预留结构，尚未接入真实计费
- 指标来自 SQLite 聚合，适合个人本地使用，不是 Prometheus/Grafana 级监控系统
- 可视化工作流第一版只展示，不保存拖拽编排

## 后续扩展路线

- 可视化拖拽编排
- Docker 沙箱执行 Agent
- 多 Agent 协作
- 成本统计和 LLM 调用监控
- Agent 版本管理
- 插件系统
- 云端部署
- 用户权限
- 商业化 SaaS
