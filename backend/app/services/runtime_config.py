from __future__ import annotations

DEFAULT_MAX_CONCURRENT_RUNS = 2
DEFAULT_TIMEOUT_SECONDS = 1800
DEFAULT_MAX_RECENT_FILES = 50
DEFAULT_ASSET_LIMIT = 50

DEFAULT_EXCLUDED_DIRS = [
    "node_modules",
    ".next",
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    ".pytest_cache",
    ".mypy_cache",
    ".turbo",
    "coverage",
    ".trash",
]

DEFAULT_EXCLUDED_FILES = [
    "*.pyc",
    "*.log",
    "*.tmp",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".obsidian/workspace.json",
]


def normalize_list(value: object, fallback: list[str]) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [line.strip() for line in value.replace(",", "\n").splitlines() if line.strip()]
    return fallback


def normalize_int(value: object, fallback: int, minimum: int = 1) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return max(minimum, parsed)
