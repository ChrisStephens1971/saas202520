#!/usr/bin/env bash
# Validate Daily Practices
# Checks if required daily practices have been completed
# Exit 0 if valid, exit 1 if practices not done (blocks operations)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if workflow strict mode enabled
WORKFLOW_CONFIG=".workflow-config.json"
if [ -f "$WORKFLOW_CONFIG" ]; then
    STRICT_MODE=$(jq -r '.strictMode // true' "$WORKFLOW_CONFIG")
    ENFORCE_DAILY=$(jq -r '.enforceDailyPractices // true' "$WORKFLOW_CONFIG")

    if [ "$STRICT_MODE" = "false" ] || [ "$ENFORCE_DAILY" = "false" ]; then
        echo -e "${GREEN}✓${NC} Strict mode disabled - skipping daily practice validation"
        exit 0
    fi
fi

# Check if we should skip validation (allow override)
if [ "${SKIP_DAILY_VALIDATION:-}" = "1" ]; then
    echo -e "${YELLOW}⚠${NC} Daily practice validation skipped (override)"
    exit 0
fi

echo "=== Validating Daily Practices ==="
echo ""

ERRORS=0
TODAY=$(date +%Y-%m-%d)

# 1. Check if GitHub health check ran today
echo -n "GitHub health check (today): "
if [ -f ".workflow-state.json" ]; then
    LAST_HEALTH_CHECK=$(jq -r '.dailyPractices.githubHealthCheck.lastCheck // "never"' .workflow-state.json 2>/dev/null || echo "never")
    if [ "$LAST_HEALTH_CHECK" = "$TODAY" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} (last check: $LAST_HEALTH_CHECK)"
        echo "  Run: bash scripts/check-github-health.sh"
        ((ERRORS++))
    fi
elif [ -f ".project-workflow.json" ]; then
    # Check in .project-workflow.json if .workflow-state.json doesn't exist
    LAST_HEALTH_CHECK=$(jq -r '.dailyPractices.githubHealthCheck.lastCheck // "never"' .project-workflow.json 2>/dev/null || echo "never")
    if [ "$LAST_HEALTH_CHECK" = "$TODAY" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC} (last check: $LAST_HEALTH_CHECK)"
        echo "  Run: bash scripts/check-github-health.sh"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} (workflow files not found, skipping)"
fi

# 2. Check if commit made today (if repo exists)
if [ -d ".git" ]; then
    echo -n "Commit made today: "
    COMMITS_TODAY=$(git log --since="$TODAY 00:00" --oneline 2>/dev/null | wc -l)
    if [ "$COMMITS_TODAY" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} ($COMMITS_TODAY commits)"
    else
        echo -e "${YELLOW}⚠${NC} (no commits today)"
        echo "  Reminder: Commit frequently (min once/day)"
        # Don't count as error - just warning
    fi
fi

# 3. Check if workflow updated today
echo -n "Workflow updated today: "
if [ -f ".project-workflow.json" ]; then
    LAST_WORKFLOW_UPDATE=$(jq -r '.lastUpdated // "never"' .project-workflow.json 2>/dev/null || echo "never")
    if [ "$LAST_WORKFLOW_UPDATE" = "$TODAY" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} (last update: $LAST_WORKFLOW_UPDATE)"
        echo "  Update task status in .project-workflow.json"
        # Don't count as error if same day week  - just warning
    fi
fi

echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ Daily practices not completed${NC}"
    echo ""
    echo "To proceed anyway (not recommended):"
    echo "  git commit --no-verify"
    echo "  SKIP_DAILY_VALIDATION=1 git push"
    echo ""
    echo "Or complete the practices first (recommended)"
    exit 1
else
    echo -e "${GREEN}✓ All daily practices completed${NC}"
    exit 0
fi
