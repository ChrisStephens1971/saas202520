#!/usr/bin/env bash
# GitHub Health Check: Identifies failing workflows and provides fix guidance
# Run this regularly to catch and fix GitHub errors before they accumulate

set -euo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== GitHub Health Check ===${NC}"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

# Get repository from remote
repo_url=$(git remote get-url origin 2>/dev/null || echo "")
if [[ ! "$repo_url" =~ github.com ]]; then
    echo -e "${RED}❌ Not a GitHub repository${NC}"
    exit 1
fi

# Extract repo name
repo=$(echo "$repo_url" | sed -E 's|.*github.com[:/]([^/]+/[^.]+)(\.git)?|\1|')
echo -e "Repository: ${BLUE}$repo${NC}"
echo ""

# Check latest workflow runs
echo -e "${BLUE}📊 Latest Workflow Runs (last 10):${NC}"
gh run list --repo "$repo" --limit 10 --json conclusion,status,name,workflowName,createdAt,headBranch \
  --jq '.[] | "\(.conclusion // .status)\t\(.workflowName)\t\(.headBranch)\t\(.createdAt)"' | \
  awk -F'\t' '{
    status=$1
    workflow=$2
    branch=$3
    date=$4

    if (status == "failure") color="\033[0;31m❌"
    else if (status == "success") color="\033[0;32m✅"
    else if (status == "in_progress") color="\033[1;33m⏳"
    else color="\033[1;33m⚠️ "

    printf "%s %s\033[0m - %s (%s)\n", color, status, workflow, branch
  }'

echo ""

# Count failures
failure_count=$(gh run list --repo "$repo" --limit 20 --json conclusion --jq '[.[] | select(.conclusion == "failure")] | length')

if [ "$failure_count" -gt 0 ]; then
    echo -e "${RED}⚠️  Found $failure_count failed workflow runs in last 20${NC}"
    echo ""
    echo -e "${YELLOW}🔧 RECOMMENDED ACTIONS:${NC}"
    echo "1. View latest failure details:"
    echo "   gh run view --repo $repo"
    echo ""
    echo "2. View logs for specific run:"
    echo "   gh run view <run-id> --log --repo $repo"
    echo ""
    echo "3. Re-run failed workflow (if transient failure):"
    echo "   gh run rerun <run-id> --repo $repo"
    echo ""
    echo -e "${RED}📋 ACTION REQUIRED: Fix these errors before next commit${NC}"
    exit 1
else
    echo -e "${GREEN}✅ No recent failures - GitHub Actions healthy${NC}"
fi

# Check for workflow warnings (would need to parse logs - simplified version)
echo ""
echo -e "${BLUE}💡 Best Practices:${NC}"
echo "• Fix warnings even if builds pass"
echo "• Keep dependencies up to date"
echo "• Monitor workflow run times"
echo "• Review security alerts: gh api repos/$repo/dependabot/alerts"

exit 0
