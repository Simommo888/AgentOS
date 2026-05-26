from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def now() -> datetime:
    return datetime.utcnow()


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(120), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    type: Mapped[str] = mapped_column(String(80), default="manual")
    status: Mapped[str] = mapped_column(String(40), default="enabled")
    entrypoint: Mapped[str] = mapped_column(String(500), nullable=False)
    working_directory: Mapped[str] = mapped_column(String(500), default="")
    command: Mapped[str] = mapped_column(Text, nullable=False)
    schedule: Mapped[str] = mapped_column(String(120), default="")
    output_type: Mapped[str] = mapped_column(String(80), default="markdown")
    output_path: Mapped[str] = mapped_column(String(500), default="")
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    tools_json: Mapped[str] = mapped_column(Text, default="[]")
    prompts_json: Mapped[str] = mapped_column(Text, default="[]")
    workflow_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_run_status: Mapped[str] = mapped_column(String(40), default="never")
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=1800)
    retry_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=0)
    retry_delay_seconds: Mapped[int] = mapped_column(Integer, default=30)

    runs: Mapped[list["AgentRun"]] = relationship(back_populates="agent")


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="pending")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    command: Mapped[str] = mapped_column(Text, default="")
    stdout: Mapped[str] = mapped_column(Text, default="")
    stderr: Mapped[str] = mapped_column(Text, default="")
    output_summary: Mapped[str] = mapped_column(Text, default="")
    output_files_json: Mapped[str] = mapped_column(Text, default="[]")
    error_message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    parent_run_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timeout_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cancelled_by: Mapped[str] = mapped_column(String(120), default="")
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    llm_provider: Mapped[str] = mapped_column(String(120), default="")
    llm_model: Mapped[str] = mapped_column(String(200), default="")
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    cost_currency: Mapped[str] = mapped_column(String(20), default="USD")

    agent: Mapped[Agent] = relationship(back_populates="runs")
    logs: Mapped[list["AgentLog"]] = relationship(back_populates="run")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int | None] = mapped_column(ForeignKey("agent_runs.id"), nullable=True, index=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    level: Mapped[str] = mapped_column(String(40), default="info")
    message: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=now)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")

    run: Mapped[AgentRun | None] = relationship(back_populates="logs")


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True, index=True)
    scenario: Mapped[str] = mapped_column(String(120), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    cron: Mapped[str] = mapped_column(String(120), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class ToolPermission(Base):
    __tablename__ = "tool_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    tool_name: Mapped[str] = mapped_column(String(120), nullable=False)
    permission: Mapped[str] = mapped_column(String(80), default="read")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)


class KnowledgeAsset(Base):
    __tablename__ = "knowledge_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("agents.id"), nullable=True, index=True)
    run_id: Mapped[int | None] = mapped_column(ForeignKey("agent_runs.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(260), default="")
    asset_type: Mapped[str] = mapped_column(String(80), default="markdown")
    file_path: Mapped[str] = mapped_column(String(800), nullable=False)
    suggested_location: Mapped[str] = mapped_column(String(500), default="")
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
