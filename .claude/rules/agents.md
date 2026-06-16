## Agent Crew

This project uses a named multi-agent setup. Each agent lives in `agents/<name>/` with its own CLAUDE.md (relative to the monorepo root at `/home/div-dev/div_dev_code/`).

| Agent | Role | Call when |
|-------|------|-----------|
| Atlas | Manufacturing automation strategist | Starting a new feature or client workflow — plan first |
| Forge | Backend engineer | Building APIs, schema, services, event pipelines |
| Nova  | UI/UX designer | Any UI code needs review or improvement |
| Rex   | QA tester | Code is ready — write tests, find gaps |
| Kira  | Tech lead / architect | Final review, architecture decisions, ship/hold call |

**Recommended workflow:** Atlas → Forge → Rex → Nova → Kira

## How to activate an agent

From the project root:
```bash
claude --system-prompt "$(cat agents/rex/CLAUDE.md)"
```

Or cd into the agent folder and run claude — it picks up CLAUDE.md automatically:
```bash
cd agents/atlas && claude
```
