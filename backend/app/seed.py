import json

from app.database import SessionLocal, init_db
from app.models import Agent, Prompt, Schedule, ToolPermission


def workflow(nodes: list[dict], edges: list[dict]) -> str:
    return json.dumps({"nodes": nodes, "edges": edges}, ensure_ascii=False)


AI_NEWS_WORKFLOW = workflow(
    [
        {"id": "sources", "name": "Sources", "type": "source", "status": "ready", "description": "RSS, web pages, product updates."},
        {"id": "people", "name": "People Watch", "type": "source", "status": "ready", "description": "Track selected AI builders and researchers."},
        {"id": "papers", "name": "Papers", "type": "source", "status": "ready", "description": "Collect paper signals."},
        {"id": "github", "name": "GitHub Trending", "type": "source", "status": "ready", "description": "Collect trending repositories."},
        {"id": "dedupe", "name": "Deduplication", "type": "process", "status": "ready", "description": "Remove duplicated news items."},
        {"id": "classify", "name": "Classification", "type": "process", "status": "ready", "description": "Classify by topic and signal type."},
        {"id": "score", "name": "Scoring", "type": "process", "status": "ready", "description": "Score novelty and personal relevance."},
        {"id": "summary", "name": "LLM Summary", "type": "llm", "status": "ready", "description": "Generate concise Chinese summaries."},
        {"id": "report", "name": "Markdown Report", "type": "output", "status": "ready", "description": "Render the daily report."},
        {"id": "obsidian", "name": "Obsidian Write", "type": "output", "status": "ready", "description": "Write Markdown into the vault."},
        {"id": "dashboard", "name": "Dashboard Update", "type": "output", "status": "ready", "description": "Update dashboard entry points."},
    ],
    [
        {"id": "e1", "source": "sources", "target": "dedupe"},
        {"id": "e2", "source": "people", "target": "dedupe"},
        {"id": "e3", "source": "papers", "target": "dedupe"},
        {"id": "e4", "source": "github", "target": "dedupe"},
        {"id": "e5", "source": "dedupe", "target": "classify"},
        {"id": "e6", "source": "classify", "target": "score"},
        {"id": "e7", "source": "score", "target": "summary"},
        {"id": "e8", "source": "summary", "target": "report"},
        {"id": "e9", "source": "report", "target": "obsidian"},
        {"id": "e10", "source": "obsidian", "target": "dashboard"},
    ],
)

SIMPLE_WORKFLOW = workflow(
    [
        {"id": "input", "name": "Scan Inputs", "type": "source", "status": "ready", "description": "Scan configured knowledge-base folders."},
        {"id": "analyze", "name": "Analyze", "type": "process", "status": "ready", "description": "Generate structured suggestions."},
        {"id": "write", "name": "Write Markdown", "type": "output", "status": "ready", "description": "Save a Markdown output file."},
        {"id": "index", "name": "Index Asset", "type": "output", "status": "ready", "description": "Expose the output in AgentOS."},
    ],
    [
        {"id": "e1", "source": "input", "target": "analyze"},
        {"id": "e2", "source": "analyze", "target": "write"},
        {"id": "e3", "source": "write", "target": "index"},
    ],
)

AGENTS = [
    {
        "id": "ai_news_agent",
        "name": "AI 情报 Agent",
        "description": "每天搜集 AI 新闻、大佬动态、论文、开源项目和产品动态，生成 Markdown 日报。",
        "type": "scheduled",
        "status": "enabled",
        "entrypoint": "scripts/daily_ai_news_agent/daily_ai_news_agent.py",
        "working_directory": ".",
        "command": "python scripts/daily_ai_news_agent/daily_ai_news_agent.py --limit 10 --people-limit 5",
        "schedule": "0 9 * * *",
        "output_type": "markdown",
        "output_path": "04_Resources/AI-News/Daily/",
        "config_json": '{"limit": 10, "people_limit": 5}',
        "tools_json": '["web", "rss", "llm", "obsidian"]',
        "prompts_json": '["AI news daily summary"]',
        "workflow_json": AI_NEWS_WORKFLOW,
    },
    {
        "id": "knowledge_organizer_agent",
        "name": "知识库整理 Agent",
        "description": "检查 Inbox、Prompt、报错、项目和永久笔记，生成整理建议。",
        "type": "manual",
        "status": "enabled",
        "entrypoint": "scripts/knowledge_organizer_agent.py",
        "working_directory": ".",
        "command": "python scripts/knowledge_organizer_agent.py",
        "schedule": "",
        "output_type": "markdown",
        "output_path": "04_Resources/AgentOS/Knowledge-Organizer/",
        "config_json": '{"scan_dirs": ["00_Inbox", "09_Prompts", "10_Error-Fixes", "02_Projects", "05_Permanent-Notes"]}',
        "tools_json": '["filesystem", "obsidian"]',
        "prompts_json": '["Knowledge organization suggestions"]',
        "workflow_json": SIMPLE_WORKFLOW,
    },
    {
        "id": "prompt_curator_agent",
        "name": "Prompt 沉淀 Agent",
        "description": "整理和归档高价值 Prompt。",
        "type": "manual",
        "status": "enabled",
        "entrypoint": "scripts/prompt_curator_agent.py",
        "working_directory": ".",
        "command": "python scripts/prompt_curator_agent.py",
        "schedule": "",
        "output_type": "markdown",
        "output_path": "04_Resources/AgentOS/Prompt-Curator/",
        "config_json": '{"source_dir": "09_Prompts"}',
        "tools_json": '["filesystem", "obsidian"]',
        "prompts_json": '["Prompt asset curation"]',
        "workflow_json": SIMPLE_WORKFLOW,
    },
    {
        "id": "error_review_agent",
        "name": "报错复盘 Agent",
        "description": "把开发报错整理成标准 Error-Fix 笔记。",
        "type": "manual",
        "status": "enabled",
        "entrypoint": "scripts/error_review_agent.py",
        "working_directory": ".",
        "command": "python scripts/error_review_agent.py",
        "schedule": "",
        "output_type": "markdown",
        "output_path": "04_Resources/AgentOS/Error-Review/",
        "config_json": '{"source_dir": "10_Error-Fixes"}',
        "tools_json": '["filesystem", "obsidian"]',
        "prompts_json": '["Error fix review"]',
        "workflow_json": SIMPLE_WORKFLOW,
    },
    {
        "id": "github_backup_agent",
        "name": "GitHub 备份 Agent",
        "description": "检查 Git 状态并生成备份建议。",
        "type": "manual",
        "status": "enabled",
        "entrypoint": "scripts/github_backup_agent.py",
        "working_directory": ".",
        "command": "python scripts/github_backup_agent.py",
        "schedule": "",
        "output_type": "markdown",
        "output_path": "04_Resources/AgentOS/GitHub-Backup/",
        "config_json": '{"auto_push": false}',
        "tools_json": '["git", "filesystem"]',
        "prompts_json": '["Git backup checklist"]',
        "workflow_json": SIMPLE_WORKFLOW,
    },
]

PROMPTS = [
    {
        "title": "AI news daily summary",
        "agent_id": "ai_news_agent",
        "scenario": "daily_report",
        "content": "请把今天的 AI 新闻整理为面向个人开发者的中文日报，突出机会、风险和可沉淀知识点。",
        "tags_json": '["ai-news", "daily"]',
    },
    {
        "title": "Knowledge organization suggestions",
        "agent_id": "knowledge_organizer_agent",
        "scenario": "knowledge_base",
        "content": "请扫描知识库中的待整理内容，输出可执行的归档建议、缺失链接和下一步行动。",
        "tags_json": '["obsidian", "pkm"]',
    },
    {
        "title": "Git backup checklist",
        "agent_id": "github_backup_agent",
        "scenario": "backup",
        "content": "请基于 git status 生成备份建议，只给出建议，不自动 push。",
        "tags_json": '["git", "backup"]',
    },
]


def seed_database() -> None:
    init_db()
    db = SessionLocal()
    try:
        for payload in AGENTS:
            agent = db.query(Agent).filter(Agent.id == payload["id"]).first()
            if agent:
                for key, value in payload.items():
                    setattr(agent, key, value)
            else:
                db.add(Agent(**payload))
        db.commit()

        if not db.query(Schedule).filter(Schedule.agent_id == "ai_news_agent").first():
            db.add(Schedule(agent_id="ai_news_agent", cron="0 9 * * *", enabled=True))
        db.commit()

        for item in PROMPTS:
            exists = db.query(Prompt).filter(Prompt.title == item["title"], Prompt.agent_id == item["agent_id"]).first()
            if not exists:
                db.add(Prompt(**item))
        db.commit()

        for agent in AGENTS:
            tools = json.loads(agent["tools_json"])
            for tool in tools:
                exists = (
                    db.query(ToolPermission)
                    .filter(ToolPermission.agent_id == agent["id"], ToolPermission.tool_name == tool)
                    .first()
                )
                if not exists:
                    db.add(
                        ToolPermission(
                            agent_id=agent["id"],
                            tool_name=tool,
                            permission="allowed",
                            notes="Seeded by AgentOS. Review before adding new capabilities.",
                        )
                    )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
    print("AgentOS database seeded.")
