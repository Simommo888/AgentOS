import os
import sys
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "AgentOS"
    database_url: str = os.getenv("AGENTOS_DATABASE_URL", "sqlite:///./data/agentos.db")
    python_path: str = os.getenv("AGENTOS_PYTHON_PATH", sys.executable)
    llm_provider: str = os.getenv("AGENTOS_LLM_PROVIDER", "OpenAI")
    kb_root: Path = Path(
        os.getenv("AGENTOS_KB_ROOT", str(Path(__file__).resolve().parents[3]))
    ).resolve()
    default_output_dir: str = "04_Resources/AgentOS"
    allowed_entry_roots: tuple[str, ...] = ("scripts",)
    command_timeout_seconds: int = int(os.getenv("AGENTOS_COMMAND_TIMEOUT_SECONDS", "900"))

    @property
    def backend_root(self) -> Path:
        return Path(__file__).resolve().parents[1]

    @property
    def data_dir(self) -> Path:
        path = self.backend_root / "data"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def settings_file(self) -> Path:
        return self.data_dir / "settings.json"


settings = Settings()
