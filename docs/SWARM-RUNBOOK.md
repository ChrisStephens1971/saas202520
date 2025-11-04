# Multi-Agent Swarm Runbook

## Quick Start

### Initial Setup

1. **Verify configuration**
   ```bash
   cat config.json
   ```

2. **Test scripts**
   ```bash
   python scripts/aggregate-status.py
   node scripts/track-costs.js report
   node scripts/detect-deadlocks.js check
   ```

3. **Initialize agent status**
   ```bash
   mkdir -p agent-status
   echo '{"agentId":"system","type":"system","status":"idle","lastUpdate":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > agent-status/system.json
   ```

## Running the Swarm

### Manual Mode (Week 1)

Manually trigger coordinator for each ticket:

```bash
# Via GitHub Actions
gh workflow run coordinator.yml

# Or trigger from web UI:
# Actions → Coordinator → Run workflow
```

### Automated Mode (Week 3+)

Enable scheduled polling:

1. Edit `.github/workflows/coordinator.yml`
2. Uncomment the schedule section
3. Commit and push

The coordinator will poll every 15 minutes automatically.

## Daily Operations

### Check Agent Status

```bash
# View status board
cat AGENT-STATUS.md

# Or run aggregation
python scripts/aggregate-status.py
```

### Monitor Costs

```bash
# View cost report
node scripts/track-costs.js report

# Check budget alerts
node scripts/track-costs.js check
```

### Check for Deadlocks

```bash
# One-time check
node scripts/detect-deadlocks.js check

# Continuous monitoring
node scripts/detect-deadlocks.js monitor 60  # Check every 60 seconds
```

### View Metrics

```bash
node scripts/collect-metrics.js
```

## Common Tasks

### Create a New Ticket for Agents

1. Go to GitHub Projects board
2. Create new issue with:
   - Clear title
   - Acceptance criteria
   - Label with `lane:backend`, `lane:frontend`, etc.
   - Move to "Ready" column

3. Coordinator will pick it up on next poll

### Manually Assign Work to Lane

Add label to PR:
```bash
gh pr edit 123 --add-label "lane:backend"
```

### Pause an Agent

```bash
# Edit agent status file
vim agent-status/backend-123.json

# Change status to "paused"
{
  "status": "paused",
  "pausedReason": "manual",
  ...
}
```

### Resume All Agents

```bash
# Remove paused status from all agents
for file in agent-status/*.json; do
  sed -i 's/"paused"/"idle"/g' "$file"
done
```

## Troubleshooting

### Agent Not Picking Up Work

**Check:**
1. Lane capacity not exceeded
2. Agent status is "idle" not "paused"
3. Ticket is in "Ready" column
4. Ticket has correct lane label

**Fix:**
```bash
# Check config
cat config.json | jq '.lanes.backend.maxConcurrent'

# Check active agents in lane
ls -l agent-status/backend-*.json
```

### Costs Exceeded Budget

**Check:**
```bash
node scripts/track-costs.js report
```

**Fix:**
1. Review cost breakdown by lane
2. Adjust budget in config.json if needed
3. Resume agents:
   ```bash
   gh workflow run coordinator.yml
   ```

### Deadlock Detected

**Check:**
```bash
node scripts/detect-deadlocks.js check
```

**Fix:**
1. Review deadlock report
2. Cancel one of the circular PRs
3. Or manually complete blocking dependency

### Workflow Failing

**Check:**
```bash
gh run list --workflow=backend-worker.yml
gh run view <run-id>
```

**Common fixes:**
- Secrets not configured (GITHUB_TOKEN, VERCEL_TOKEN)
- Dependencies missing
- Tests failing

## Emergency Procedures

### Stop All Agents Immediately

```bash
# Disable coordinator
gh workflow disable coordinator.yml

# Pause all agents
for file in agent-status/*.json; do
  jq '.status = "paused" | .pausedReason = "emergency"' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done
```

### Rollback Bad Deployment

```bash
# Find last good commit
git log --oneline

# Revert
git revert <bad-commit-sha>
git push
```

### Clear All Agent Work

```bash
# Back up current state
cp -r agent-status agent-status.backup

# Reset to system only
rm agent-status/*.json
echo '{"agentId":"system","type":"system","status":"idle","lastUpdate":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > agent-status/system.json
```

## Monitoring

### What to Watch

- Agent utilization (should be >70%)
- Cost trend (should stay under budget)
- PR cycle time (target <4 hours)
- Deadlock frequency (should be rare)
- Human intervention rate (target <15%)

### Weekly Review

1. Check metrics: `node scripts/collect-metrics.js`
2. Review cost report
3. Check for recurring issues
4. Adjust lane capacities if needed

### Monthly Maintenance

1. Review and update agent prompts
2. Tune auto-merge thresholds
3. Update dependencies
4. Team feedback session

## Configuration Updates

### Change Lane Capacity

Edit `config.json`:
```json
{
  "lanes": {
    "backend": {
      "maxConcurrent": 5  // Increased from 3
    }
  }
}
```

### Add New Security Path

Edit `config.json`:
```json
{
  "agents": {
    "reviewer": {
      "requireHumanReviewPaths": [
        "**/new-sensitive-path/**"  // Add here
      ]
    }
  }
}
```

### Adjust Budget

Edit `config.json`:
```json
{
  "cost": {
    "budgetPerMonth": 750  // Increased from 500
  }
}
```

## Best Practices

1. **Start in manual mode** - Validate everything works
2. **Monitor costs closely** - First week especially
3. **Review agent work** - Ensure quality is good
4. **Tune capacity gradually** - Don't max out immediately
5. **Keep humans in the loop** - For security and breaking changes
6. **Document issues** - Help improve the system

## Getting Help

- **System status**: Check AGENT-STATUS.md
- **Logs**: GitHub Actions → Workflow runs
- **Issues**: Create issue with `swarm-support` label
- **Urgent**: Ping @tech-lead in Slack

---

*For detailed architecture, see docs/MULTI-TENANT-SWARM-GUIDE.md*