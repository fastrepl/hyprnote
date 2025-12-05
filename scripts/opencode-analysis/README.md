# OpenCode Analysis Workflow

Automated code analysis using OpenCode CLI with Claude AI to find bugs, refactoring opportunities, and create Devin sessions for fixes.

## Overview

This workflow runs periodically (weekly by default) to analyze the codebase and identify:
- Potential bugs or error-prone patterns
- Refactoring opportunities
- Performance issues
- Security concerns
- Missing error handling

## Prerequisites

1. **OpenCode CLI** with Claude Max plan authentication
2. **ANTHROPIC_API_KEY** secret in GitHub repository
3. **DEVIN_API_KEY** secret (optional, for creating Devin sessions)

## Setup

### 1. Authenticate OpenCode with Claude Max

```bash
opencode
/connect
# Select "Claude Pro/Max" and authenticate
```

### 2. Add GitHub Secrets

- `ANTHROPIC_API_KEY`: Your Anthropic API key (or use Claude Max OAuth)
- `DEVIN_API_KEY`: Your Devin API key (for creating sessions)

## Usage

### Manual Trigger

Run the workflow manually from GitHub Actions:

1. Go to Actions > "OpenCode Analysis"
2. Click "Run workflow"
3. Configure options:
   - `create_devin_sessions`: Create Devin sessions for findings
   - `max_concurrency`: Max parallel analyses (default: 3)

### Scheduled Runs

The workflow runs automatically every Monday at 6:00 AM UTC.

### Local Execution

```bash
# Run analysis
MAX_CONCURRENCY=3 ./scripts/opencode-analysis/analyze.sh

# Parse findings
./scripts/opencode-analysis/create-devin-sessions.sh parse

# Create Devin sessions (requires DEVIN_API_KEY)
DEVIN_API_KEY=your_key ./scripts/opencode-analysis/create-devin-sessions.sh create
```

## Configuration

### Analysis Targets

Edit `analyze.sh` to modify the `TARGETS` array:

```bash
TARGETS=(
    "path/to/component:Description"
    ...
)
```

### Concurrency

Set `MAX_CONCURRENCY` environment variable (default: 3).

## Output

- `output/*.json`: Raw analysis results per target
- `findings.json`: Aggregated findings for Devin session creation

## Workflow Jobs

1. **analyze**: Runs OpenCode analysis on all targets
2. **create-sessions**: Creates Devin sessions for findings (optional)
