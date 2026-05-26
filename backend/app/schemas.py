from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AgentBase(BaseModel):
    name: str
    description: str = ""
    type: str = "manual"
    status: str = "enabled"
    entrypoint: str
    working_directory: str = ""
    command: str
    schedule: str = ""
    output_type: str = "markdown"
    output_path: str = ""
    config_json: str = "{}"
    tools_json: str = "[]"
    prompts_json: str = "[]"
    workflow_json: str = "{}"


class AgentCreate(AgentBase):
    id: str


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None
    status: str | None = None
    entrypoint: str | None = None
    working_directory: str | None = None
    command: str | None = None
    schedule: str | None = None
    output_type: str | None = None
    output_path: str | None = None
    config_json: str | None = None
    tools_json: str | None = None
    prompts_json: str | None = None
    workflow_json: str | None = None


class AgentRead(AgentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    last_run_at: datetime | None = None
    last_run_status: str = "never"


class AgentRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_id: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    duration_seconds: float | None = None
    command: str = ""
    stdout: str = ""
    stderr: str = ""
    output_summary: str = ""
    output_files_json: str = "[]"
    error_message: str = ""
    created_at: datetime


class AgentRunStartRead(BaseModel):
    run_id: int
    agent_id: str
    status: str
    message: str


class AgentRunQueueItem(BaseModel):
    run_id: int
    agent_id: str
    agent_name: str = ""
    status: str
    started_at: datetime
    duration_seconds: float | None = None
    command: str = ""
    output_summary: str = ""
    error_message: str = ""


class AgentRunQueueRead(BaseModel):
    pending_runs: list[AgentRunQueueItem] = Field(default_factory=list)
    running_runs: list[AgentRunQueueItem] = Field(default_factory=list)
    recently_finished_runs: list[AgentRunQueueItem] = Field(default_factory=list)
    active_count: int = 0
    pending_count: int = 0
    failed_count_today: int = 0
    success_count_today: int = 0


class AgentLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    run_id: int | None = None
    agent_id: str
    level: str
    message: str
    timestamp: datetime
    metadata_json: str = "{}"


class PromptBase(BaseModel):
    title: str
    agent_id: str | None = None
    scenario: str = ""
    content: str = ""
    tags_json: str = "[]"


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    title: str | None = None
    agent_id: str | None = None
    scenario: str | None = None
    content: str | None = None
    tags_json: str | None = None


class PromptRead(PromptBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ScheduleBase(BaseModel):
    agent_id: str
    cron: str
    enabled: bool = True


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    agent_id: str | None = None
    cron: str | None = None
    enabled: bool | None = None


class ScheduleRead(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    next_run_at: datetime | None = None
    last_run_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ToolPermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_id: str
    tool_name: str
    permission: str
    notes: str
    created_at: datetime
    updated_at: datetime


class ToolPermissionUpdate(BaseModel):
    permission: str | None = None
    notes: str | None = None


class KnowledgeAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent_id: str | None = None
    run_id: int | None = None
    title: str
    asset_type: str
    file_path: str
    suggested_location: str
    tags_json: str
    created_at: datetime


class SettingsRead(BaseModel):
    knowledge_base_root: str
    python_path: str
    default_output_dir: str
    llm_provider: str
    database_url: str
    required_env: list[str] = Field(default_factory=list)
    security_notes: list[str] = Field(default_factory=list)


class SettingsUpdate(BaseModel):
    knowledge_base_root: str | None = None
    python_path: str | None = None
    default_output_dir: str | None = None
    llm_provider: str | None = None


class ApiMessage(BaseModel):
    message: str
    data: dict[str, Any] | None = None


class AgentHealthRead(BaseModel):
    agent_id: str
    entrypoint_exists: bool
    working_directory_exists: bool
    output_path_exists: bool
    requirements_exists: bool
    openai_api_key_configured: bool
    can_run: bool
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    entrypoint_path: str = ""
    working_directory_path: str = ""
    output_path: str = ""
    requirements_path: str = ""
    missing_requirements: list[str] = Field(default_factory=list)
