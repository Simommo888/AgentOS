# AgentOS

## 第四阶段更新：异步队列、取消与知识库扫描优化

AgentOS 现在的 Agent 运行采用本地后台线程执行。前端点击“立即运行”后，后端会先创建一条 `AgentRun(status=pending)`，立即返回 `run_id`，随后后台线程把状态更新为 `running` 并启动已注册的 Python 脚本。前端通过 `GET /api/runs/{id}` 和 `GET /api/runs/{id}/logs` 轮询状态与日志。

Runs 页面顶部新增“运行队列”，用于查看当前 running 任务、pending 任务、今日成功数量、今日失败数量和最近完成任务。对 running/pending 任务可以点击“取消运行”，后端会调用 `POST /api/runs/{id}/cancel`，只终止 AgentOS 自己通过 `subprocess.Popen(shell=False)` 启动并登记在本地注册表中的子进程。

如果 AgentOS 后端在 Agent 运行过程中重启，数据库中可能残留 `pending` 或 `running` 状态。启动时 `repair_stale_runs()` 会扫描这些记录，并写入错误说明：`AgentOS restarted while this run was active. Marked as stale.`，同时写入 warning 日志：`Stale running run detected and repaired.`

Knowledge Base 扫描默认排除这些目录：`node_modules`, `.next`, `.git`, `__pycache__`, `.venv`, `venv`, `env`, `dist`, `build`, `.pytest_cache`, `.mypy_cache`, `.turbo`, `coverage`, `.trash`。默认排除这些文件：`*.pyc`, `*.log`, `*.tmp`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `.obsidian/workspace.json`。这样可以避免把依赖包 README、构建产物和缓存文件当作知识资产展示，也能显著提升 Knowledge Base 页面加载速度。

AgentOS 是一个面向个人开发者的本地 Agent 智能管理平台，用来统一注册、运行、调度和观察你的 AI Agent，并把输出沉淀进 Obsidian 知识库。

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
- 执行：通过 `subprocess` 运行已注册的本地 Python Agent 脚本，默认 `shell=False`
- 知识库：默认读取当前 `My-Knowledge-Base`，索引 Markdown 输出文件

## 功能列表

- Agent 注册、列表、详情、配置编辑
- Agent 手动运行、启用、禁用
- 运行记录、运行日志、错误信息、输出文件索引
- APScheduler 本地单进程定时任务
- Prompt 模板管理
- 工具权限查看和编辑
- 知识库路径、输出目录、环境变量说明
- React Flow 工作流可视化
- 预置 `daily_ai_news_agent` 和 4 个可运行占位 Agent

## 目录结构

```text
agentos/
  backend/     FastAPI 服务、SQLite 模型、Runner、Scheduler
  frontend/    Next.js 控制台
  docs/        AgentOS 产品和使用规范
```

## 启动后端

```bash
cd agentos/backend
pip install -r requirements.txt
python -m app.seed
uvicorn main:app --reload
```

访问 `http://localhost:8000/docs`。

## 启动前端

```bash
cd agentos/frontend
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 初始化数据库

```bash
cd agentos/backend
python -m app.seed
```

该命令会创建 SQLite 表，并预置 AI 情报 Agent、知识库整理 Agent、Prompt 沉淀 Agent、报错复盘 Agent 和 GitHub 备份 Agent。

## 注册新 Agent

新 Agent 至少需要：

- `id`
- `name`
- `description`
- `entrypoint`
- `command`
- `output_path`
- `tools_json`
- `workflow_json`

可以通过 `POST /api/agents` 注册，也可以把默认记录加入 `backend/app/seed.py`。

## 运行 Agent

- 前端：进入 Dashboard 或 Agents 页面，点击“立即运行”
- API：`POST /api/agents/{id}/run`

Runner 会记录 `AgentRun`、`AgentLog`，并扫描 Agent 的 `output_path`，把 Markdown 输出写入 `KnowledgeAsset` 索引。

## 查看日志

- 前端：打开 `/logs` 或 `/runs`
- API：`GET /api/logs`、`GET /api/runs/{id}/logs`

## 配置定时任务

打开 `/schedules` 创建或编辑 cron 表达式。第一版使用 APScheduler 本地单进程调度，适合个人电脑常驻运行。

示例：

```text
0 9 * * *    每天 09:00
*/30 * * * * 每 30 分钟
```

## 接入 Obsidian 知识库

默认知识库根目录是当前 `My-Knowledge-Base`。Agent 输出 Markdown 到知识库路径后，AgentOS 会扫描并显示在 Knowledge Base 页面。

推荐目录：

- `04_Resources/AI-News/Daily`
- `04_Resources/AgentOS`
- `09_Prompts`
- `10_Error-Fixes`
- `11_Business-Ideas`
- `05_Permanent-Notes`

## 接入 AI 情报 Agent

已预置：

```text
id: ai_news_agent
entrypoint: scripts/daily_ai_news_agent/daily_ai_news_agent.py
command: python scripts/daily_ai_news_agent/daily_ai_news_agent.py --limit 10 --people-limit 5
schedule: 0 9 * * *
```

如果该脚本缺少依赖或 API Key，AgentOS 会把失败记录写入运行记录和日志，不会导致平台崩溃。

## 运行 AI 情报 Agent

前端方式：

1. 启动后端和前端。
2. 打开 `http://localhost:3000`。
3. 在 Dashboard 点击“运行 AI 情报 Agent”，或进入 Agents → AI 情报 Agent → 立即运行。

命令行验证：

```bash
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --dry-run --verbose
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --no-llm
```

## 配置 OPENAI_API_KEY

复制环境变量模板：

```bash
cd agentos
copy .env.example .env
```

然后在 `.env` 或当前终端环境中配置：

```text
OPENAI_API_KEY=你的 Key
AI_NEWS_LLM_MODEL=gpt-4.1-mini
AI_NEWS_LLM_BASE_URL=
```

AgentOS 不会在前端、Runs、Logs 中显示 API Key 明文。

## 没有 API Key 的 no-llm 模式

如果 `OPENAI_API_KEY` 不存在，AgentOS 会自动把 AI 情报 Agent 降级为：

```bash
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --no-llm
```

该模式会使用规则摘要，仍然可以生成 Markdown 日报和 People Watch 文件。

## AI 情报输出目录

- 日报：`04_Resources/AI-News/Daily/`
- AI 大佬动态：`04_Resources/AI-News/People-Watch/`
- 原始缓存：`04_Resources/AI-News/Raw/`

运行成功后，输出会显示在前端 Knowledge Base 页面中的“AI 情报日报”和“AI 大佬动态”区域。

## AI 情报 Agent 失败排查

打开：

- Runs：查看 `status`、`error_message`、`output_summary`、`output_files`
- Logs：按 `ai_news_agent` 过滤，查看关键步骤、stderr 和错误日志
- Agent 详情页：查看健康检查卡片，包括 entrypoint、requirements.txt、输出目录和 API Key 状态

常见修复：

```bash
python -m pip install -r scripts/daily_ai_news_agent/requirements.txt
python scripts/daily_ai_news_agent/daily_ai_news_agent.py --dry-run --verbose
```

## 环境变量

复制示例文件：

```bash
cd agentos
copy .env.example .env
```

不要把真实 API Key 写入代码或日志。

## 安全边界

- 不执行未注册命令
- 只允许执行注册在 `scripts` 下的 Python entrypoint
- 使用 `shell=False`
- 不显示 API Key 明文
- 不删除知识库文件
- 不自动 push GitHub
- 不做多用户权限或云端部署

## 当前限制

- 本地单进程调度
- Agent 停止运行按钮为预留能力
- 只支持本地 Python 脚本执行
- 没有 Docker 沙箱和多用户权限
- 可视化工作流第一版只展示，不保存拖拽编排

## 后续扩展路线

- 可视化拖拽编排
- Docker 沙箱执行 Agent
- 多 Agent 协作
- 成本统计
- LLM 调用监控
- Agent 版本管理
- 插件系统
- 云端部署
- 用户权限
- 商业化 SaaS
