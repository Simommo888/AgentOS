# AgentOS Backend

AgentOS Backend is a local FastAPI service for registering, running, scheduling, and observing personal AI agents.

## Start

```bash
cd agentos/backend
pip install -r requirements.txt
python -m app.seed
uvicorn main:app --reload
```

Open `http://localhost:8000/docs`.

## Notes

- SQLite data lives in `data/agentos.db`.
- Agent scripts are executed with `subprocess` and `shell=False`.
- API keys are read from environment variables only and are masked in logs.
