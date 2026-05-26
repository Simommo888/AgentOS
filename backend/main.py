from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agents, knowledge_base, logs, prompts, runs, schedules, settings, tools
from app.database import init_db
from app.seed import seed_database
from app.services.agent_runner import repair_stale_runs
from app.services.scheduler import start_scheduler

app = FastAPI(title="AgentOS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    seed_database()
    repair_stale_runs()
    start_scheduler()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "AgentOS"}


app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(logs.router, prefix="/api/logs", tags=["logs"])
app.include_router(prompts.router, prefix="/api/prompts", tags=["prompts"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["schedules"])
app.include_router(knowledge_base.router, prefix="/api/knowledge-base", tags=["knowledge-base"])
app.include_router(tools.router, prefix="/api/tools", tags=["tools"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
