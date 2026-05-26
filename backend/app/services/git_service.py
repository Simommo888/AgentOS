import subprocess
from pathlib import Path

from app.config import settings


def git_status_summary(path: Path | None = None) -> str:
    cwd = path or settings.kb_root
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            cwd=str(cwd),
            capture_output=True,
            text=True,
            shell=False,
            timeout=20,
        )
    except Exception as exc:
        return f"Git status unavailable: {exc}"
    if result.returncode != 0:
        return result.stderr.strip() or "Not a git repository."
    return result.stdout.strip() or "Working tree clean."
