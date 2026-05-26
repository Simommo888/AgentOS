import os
import shlex
from pathlib import Path

from app.config import settings
from app.models import Agent
from app.services.settings_service import runtime_kb_root, runtime_python_path
from app.utils.paths import ensure_inside, resolve_kb_relative

DANGEROUS_TOKENS = {
    "&&",
    "||",
    ";",
    "|",
    ">",
    "<",
    "`",
    "$(",
}

DANGEROUS_COMMANDS = {
    "cmd",
    "cmd.exe",
    "powershell",
    "powershell.exe",
    "pwsh",
    "pwsh.exe",
    "rm",
    "del",
    "erase",
    "rmdir",
    "move",
    "mv",
    "curl",
    "wget",
}


class SecurityError(ValueError):
    pass


def mask_secrets(text: str) -> str:
    if not text:
        return text
    masked = text
    for key, value in os.environ.items():
        if not value:
            continue
        upper_key = key.upper()
        if any(token in upper_key for token in ("KEY", "TOKEN", "SECRET", "PASSWORD")):
            masked = masked.replace(value, "***")
    return masked


def validate_entrypoint(agent: Agent) -> Path:
    entrypoint = resolve_kb_relative(agent.entrypoint)
    kb_root = runtime_kb_root()
    allowed_roots = [(kb_root / root).resolve() for root in settings.allowed_entry_roots]
    if not any(ensure_inside(entrypoint, root) for root in allowed_roots):
        raise SecurityError(f"Entrypoint is outside allowed roots: {agent.entrypoint}")
    if not entrypoint.exists():
        raise SecurityError(f"Entrypoint does not exist: {agent.entrypoint}")
    if entrypoint.suffix.lower() != ".py":
        raise SecurityError("Only Python agent scripts are supported in v1.")
    return entrypoint


def build_safe_command(agent: Agent) -> list[str]:
    raw_command = agent.command.strip()
    if not raw_command:
        raise SecurityError("Agent command is empty.")
    for token in DANGEROUS_TOKENS:
        if token in raw_command:
            raise SecurityError(f"Dangerous shell token is not allowed: {token}")

    try:
        parts = shlex.split(raw_command, posix=os.name != "nt")
    except ValueError as exc:
        raise SecurityError(f"Command cannot be parsed safely: {exc}") from exc
    if len(parts) < 2:
        raise SecurityError("Agent command must include a Python script.")

    executable = Path(parts[0]).name.lower()
    if executable in DANGEROUS_COMMANDS:
        raise SecurityError(f"Dangerous command is not allowed: {parts[0]}")
    if executable not in {"python", "python.exe", "python3", "python3.exe", "py", "py.exe"}:
        raise SecurityError("Only Python script execution is allowed in v1.")

    entrypoint = validate_entrypoint(agent)
    script_token_index = None
    for index, part in enumerate(parts[1:], start=1):
        candidate = resolve_kb_relative(part)
        if candidate == entrypoint:
            script_token_index = index
            break
    if script_token_index is None:
        raise SecurityError("Command script must match registered entrypoint.")

    args = parts[script_token_index + 1 :]
    for arg in args:
        lowered = arg.lower()
        if lowered in DANGEROUS_COMMANDS or any(token in arg for token in DANGEROUS_TOKENS):
            raise SecurityError(f"Dangerous argument is not allowed: {arg}")
    return [runtime_python_path(), str(entrypoint), *args]
