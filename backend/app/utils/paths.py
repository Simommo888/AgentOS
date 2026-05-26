from pathlib import Path

from app.services.settings_service import runtime_kb_root


def kb_path(*parts: str) -> Path:
    return runtime_kb_root().joinpath(*parts).resolve()


def ensure_inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def resolve_kb_relative(relative_or_absolute: str) -> Path:
    path = Path(relative_or_absolute)
    if path.is_absolute():
        return path.resolve()
    return (runtime_kb_root() / path).resolve()
