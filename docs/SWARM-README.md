# Multi-Agent Swarm System

## Overview

This repository includes an automated multi-agent swarm system that enables parallel AI-driven development with 3-5x velocity improvements.

## What It Does

- **Automates Development**: AI agents handle contract design, backend implementation, frontend work, and testing
- **Enforces Safety**: Automatic security scanning, human review for sensitive changes
- **Multi-Tenant Aware**: Built-in tenant isolation validation for subdomain-based multi-tenancy
- **Cost Controlled**: Budget tracking with automatic pausing at thresholds
- **Observable**: Real-time status board, metrics, and deadlock detection

## Quick Start

### 1. Verify Setup

```bash
# Check configuration
cat config.json

# Test scripts
python scripts/aggregate-status.py
node scripts/track-costs.js report
```

### 2. Create Your First Ticket

1. Go to GitHub Projects board
2. Create new issue:
   ```markdown
   ## Add health check endpoint

   Create GET /api/health that returns { status: "ok" }

   - [ ] Endpoint returns 200
   - [ ] Response has status field
   - [ ] Includes unit test
   ```

3. Add label: `lane:backend`
4. Move to "Ready" column

### 3. Trigger Coordinator

```bash
gh workflow run coordinator.yml
```

### 4. Watch It Work

```bash
# View status
cat AGENT-STATUS.md

# Check PR created
gh pr list

# Monitor costs
node scripts/track-costs.js report
```

## Architecture

```
┌─────────────────────────────────┐
│      Coordinator                 │
│   (Polls board every 15 min)    │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┬──────────┬──────────┐
    ▼                 ▼          ▼          ▼
┌─────────┐    ┌──────────┐ ┌──────────┐ ┌──────┐
│Contract │    │ Backend  │ │ Frontend │ │ Test │
│ Worker  │    │  Worker  │ │  Worker  │ │Worker│
└─────────┘    └──────────┘ └──────────┘ └──────┘
    │                │            │          │
    └────────────────┴────────────┴──────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Reviewer/Merger │
            │  (Auto-merge)   │
            └─────────────────┘
```

## System Components

### Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| Coordinator | Orchestrates work | Manual / Schedule |
| Contract Worker | API validation | PR to `packages/api-contracts/` |
| Backend Worker | Backend CI | PR to backend paths |
| Frontend Worker | Frontend CI + Preview | PR to frontend paths |
| Test Worker | Test execution | PR to `tests/` |
| Reviewer/Merger | Auto-review & merge | All PRs |

### Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `aggregate-status.py` | Status dashboard | `python scripts/aggregate-status.py` |
| `track-costs.js` | Cost tracking | `node scripts/track-costs.js report` |
| `detect-deadlocks.js` | Deadlock detection | `node scripts/detect-deadlocks.js check` |
| `collect-metrics.js` | Metrics collection | `node scripts/collect-metrics.js` |
| `board-adapter-github.js` | Board polling | `node scripts/board-adapters/board-adapter-github.js poll` |

## Configuration

### Core Settings (`config.json`)

```json
{
  "lanes": {
    "backend": {
      "maxConcurrent": 3,    // Max parallel work
      "model": "haiku"       // AI model to use
    }
  },
  "cost": {
    "budgetPerMonth": 500,   // Monthly budget
    "alerts": [              // Alert thresholds
      { "threshold": 90, "action": "pause-non-critical" }
    ]
  }
}
```

### Security Paths

Paths requiring human review:
- `**/auth/**` - Authentication code
- `**/tenant/**` - Tenant isolation
- `prisma/migrations/**` - Database changes
- `packages/api-contracts/**` - API contracts

## Multi-Tenant Features

This system is configured for **subdomain-based multi-tenancy**:

### Automatic Checks

- ✅ Every schema includes `tenant_id`
- ✅ Every endpoint requires `X-Tenant-ID` header
- ✅ All queries filtered by tenant_id
- ✅ Cross-tenant access is blocked
- ✅ Subdomain routing validated

### Enforcement

- Contract tests validate tenant patterns
- Backend tests check query scoping
- E2E tests verify isolation
- Human review required for tenant code changes

## Safety Mechanisms

### Auto-Merge Conditions

PR must meet ALL:
- ✅ Less than 10 files changed
- ✅ Less than 800 lines added
- ✅ No security-sensitive paths
- ✅ All CI checks passing
- ✅ No breaking changes
- ✅ No security alerts

### Human Review Triggers

Required for:
- 🔒 Security-sensitive file changes
- 🔒 Database migrations
- 🔒 Breaking API changes
- 🔒 Large PRs
- 🔒 Failed security scans

## Cost Management

### Budget Tracking

- Real-time cost calculation per agent
- Breakdown by lane and day
- Alerts at 50%, 80%, 90%, 100%
- Automatic agent pausing at thresholds

### Typical Costs

- Simple feature: $5-7
- Medium feature: $10-15
- Complex feature: $20-30
- Monthly estimate: $200-500

## Monitoring

### Daily Checks

```bash
# Agent status
cat AGENT-STATUS.md

# Cost report
node scripts/track-costs.js report

# Check for deadlocks
node scripts/detect-deadlocks.js check
```

### Key Metrics

- Agent utilization: Target >70%
- PR cycle time: Target <4 hours
- Human intervention: Target <15%
- Cost per feature: Target <$10

## Documentation

| Document | Purpose |
|----------|---------|
| [SWARM-RUNBOOK.md](SWARM-RUNBOOK.md) | Operations guide |
| [MULTI-TENANT-SWARM-GUIDE.md](MULTI-TENANT-SWARM-GUIDE.md) | Multi-tenant specifics |
| [AGENT-ONBOARDING.md](AGENT-ONBOARDING.md) | New team member guide |
| [DAYS-2-5-SUMMARY.md](swarm-implementation/DAYS-2-5-SUMMARY.md) | Implementation details |

## Troubleshooting

### Agent Not Working

**Check:**
```bash
# Is coordinator enabled?
cat config.json | jq '.agents.coordinator.enabled'

# Are agents paused?
grep "paused" agent-status/*.json

# Lane at capacity?
ls agent-status/backend-*.json | wc -l
```

### Costs Too High

**Fix:**
```bash
# Review breakdown
node scripts/track-costs.js report

# Adjust budget if needed
vim config.json  # Update cost.budgetPerMonth

# Resume agents
gh workflow run coordinator.yml
```

### Deadlock

**Resolve:**
```bash
# Check for circular dependencies
node scripts/detect-deadlocks.js check

# Cancel one of the blocking PRs
gh pr close 123

# Or manually complete dependency
```

## Rollout Phases

### Week 1: Manual Mode
- Manually trigger coordinator
- Validate everything works
- Monitor costs closely
- Team learns the system

### Week 2: Semi-Automated
- Enable coordinator polling (every 30 min)
- More tickets through system
- Tune capacities
- Build confidence

### Week 3+: Full Automation
- Polling every 15 minutes
- Minimal human intervention
- Continuous improvement
- Maximum velocity

## Success Metrics

**After 1 Month:**
- 3-5x velocity improvement
- 15-20 features/sprint (vs 5 before)
- <4 hour PR cycle time
- <15% human intervention rate
- $7-10 per feature cost
- Zero tenant isolation bugs

## Support

- **Documentation**: Check docs/ directory
- **Issues**: Create issue with `swarm-support` label
- **Urgent**: Ping @tech-lead in Slack
- **Status**: View AGENT-STATUS.md

---

**Status:** ✅ Production Ready (v2.1.2)
**Implementation Date:** 2025-11-04
**Last Updated:** 2025-11-04