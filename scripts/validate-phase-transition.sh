#!/usr/bin/env bash
# Validate Phase Transition
# Checks if project meets criteria to move to next phase
# Usage: ./validate-phase-transition.sh <current-phase> <next-phase>

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CURRENT_PHASE=$1
NEXT_PHASE=$2

echo -e "${BLUE}=== Validating Phase Transition: $CURRENT_PHASE → $NEXT_PHASE ===${NC}"
echo ""

# Check if workflow strict mode enabled
WORKFLOW_CONFIG=".workflow-config.json"
if [ -f "$WORKFLOW_CONFIG" ]; then
    STRICT_MODE=$(jq -r '.strictMode // true' "$WORKFLOW_CONFIG")
    ENFORCE_TRANSITIONS=$(jq -r '.enforcePhaseTransitions // true' "$WORKFLOW_CONFIG")

    if [ "$STRICT_MODE" = "false" ] || [ "$ENFORCE_TRANSITIONS" = "false" ]; then
        echo -e "${GREEN}✓${NC} Strict mode disabled - transition allowed"
        exit 0
    fi
fi

# Read transition criteria from .project-workflow.json
if [ ! -f ".project-workflow.json" ]; then
    echo -e "${RED}✗${NC} .project-workflow.json not found"
    exit 1
fi

TRANSITION_KEY="${CURRENT_PHASE}_to_${NEXT_PHASE}"
MANDATORY=$(jq -r ".phaseTransitions.\"$TRANSITION_KEY\".mandatory // false" .project-workflow.json)

if [ "$MANDATORY" = "false" ]; then
    echo -e "${GREEN}✓${NC} Transition not mandatory - allowed"
    exit 0
fi

echo "Transition is ${YELLOW}mandatory${NC} - checking criteria..."
echo ""

ERRORS=0

# Function to check GitHub Actions status
check_github_green() {
    if command -v gh &> /dev/null; then
        echo -n "GitHub Actions status: "
        LATEST_RUN=$(gh run list --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "unknown")
        if [ "$LATEST_RUN" = "success" ]; then
            echo -e "${GREEN}✓ green${NC}"
            return 0
        else
            echo -e "${RED}✗ $LATEST_RUN${NC}"
            echo "  Run: bash scripts/check-github-health.sh"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} GitHub CLI not found - skipping"
        return 0
    fi
}

# Function to check test coverage
check_test_coverage() {
    local MIN_COVERAGE=$1
    echo -n "Test coverage (min $MIN_COVERAGE%): "

    # Try to find coverage report
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(jq -r '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
        if (( $(echo "$COVERAGE >= $MIN_COVERAGE" | bc -l) )); then
            echo -e "${GREEN}✓ ${COVERAGE}%${NC}"
            return 0
        else
            echo -e "${RED}✗ ${COVERAGE}%${NC} (need $MIN_COVERAGE%)"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} No coverage report found"
        echo "  Run tests with coverage: npm test -- --coverage"
        return 1
    fi
}

# Function to check GitHub Actions green streak
check_green_streak() {
    local DAYS=$1
    if command -v gh &> /dev/null; then
        echo -n "GitHub Actions green streak (${DAYS} days): "
        # Get last N runs
        FAILURES=$(gh run list --limit 20 --json conclusion --jq '[.[] | select(.conclusion != "success")] | length' 2>/dev/null || echo "0")
        if [ "$FAILURES" -eq 0 ]; then
            echo -e "${GREEN}✓ no failures${NC}"
            return 0
        else
            echo -e "${RED}✗ $FAILURES failures in last 20 runs${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} GitHub CLI not found - skipping"
        return 0
    fi
}

# Check criteria based on transition
case "$CURRENT_PHASE-$NEXT_PHASE" in
    "planning-foundation")
        echo "Checking Planning → Foundation criteria:"
        echo -n "  Roadmap created: "
        if [ -f "product/roadmap.md" ] || [ -f "product/roadmap-*.md" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Create: product/roadmap.md"
            ((ERRORS++))
        fi

        echo -n "  Architecture decisions (ADRs): "
        ADR_COUNT=$(find technical/adr -name "*.md" 2>/dev/null | wc -l)
        if [ "$ADR_COUNT" -ge 2 ]; then
            echo -e "${GREEN}✓ ${ADR_COUNT} ADRs${NC}"
        else
            echo -e "${YELLOW}⚠${NC} ${ADR_COUNT} ADRs (recommended: 2+)"
        fi

        echo -n "  Sprint 1 plan: "
        if [ -f "sprints/sprint-01-plan.md" ] || [ -f "sprints/sprint-1-plan.md" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Create: sprints/sprint-01-plan.md"
            ((ERRORS++))
        fi
        ;;

    "foundation-development")
        echo "Checking Foundation → Development criteria:"
        echo -n "  Project scaffolded: "
        if [ -f "package.json" ] || [ -f "requirements.txt" ] || [ -f "pom.xml" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Initialize project structure"
            ((ERRORS++))
        fi

        echo -n "  Database schema: "
        if find . -name "*migration*" -o -name "*schema*" 2>/dev/null | grep -q .; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${YELLOW}⚠${NC} No migrations found"
        fi

        echo -n "  Authentication implemented: "
        if grep -r "auth" --include="*.js" --include="*.ts" --include="*.py" . 2>/dev/null | grep -q "login\|register\|authenticate"; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Implement authentication"
            ((ERRORS++))
        fi

        if ! check_github_green; then
            ((ERRORS++))
        fi

        echo -n "  Tests passing: "
        if [ -f "package.json" ]; then
            if npm test 2>/dev/null; then
                echo -e "${GREEN}✓${NC}"
            else
                echo -e "${RED}✗${NC}"
                echo "    Fix failing tests"
                ((ERRORS++))
            fi
        else
            echo -e "${YELLOW}⚠${NC} Skipping (no package.json)"
        fi
        ;;

    "development-testing")
        echo "Checking Development → Testing criteria:"
        echo -n "  Core features complete: "
        CURRENT_PHASE_COMPLETION=$(jq -r '.phases.development.completionPercent // 0' .project-workflow.json)
        if [ "$CURRENT_PHASE_COMPLETION" -ge 100 ]; then
            echo -e "${GREEN}✓ ${CURRENT_PHASE_COMPLETION}%${NC}"
        else
            echo -e "${RED}✗ ${CURRENT_PHASE_COMPLETION}%${NC} (need 100%)"
            echo "    Complete all development phase tasks"
            ((ERRORS++))
        fi

        if ! check_test_coverage 60; then
            ((ERRORS++))
        fi

        if ! check_green_streak 3; then
            ((ERRORS++))
        fi

        echo -n "  No critical bugs: "
        # This is a manual check - would need integration with issue tracker
        echo -e "${YELLOW}⚠${NC} Manual verification required"
        ;;

    "testing-launch")
        echo "Checking Testing → Launch criteria:"
        if ! check_test_coverage 80; then
            ((ERRORS++))
        fi

        echo -n "  Performance targets met: "
        # Would need actual performance benchmarks
        echo -e "${YELLOW}⚠${NC} Manual verification required"

        echo -n "  Security audit passed: "
        if [ -f "docs/security-audit.md" ] || [ -f "security-audit-report.md" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Complete security audit"
            ((ERRORS++))
        fi

        if ! check_github_green; then
            ((ERRORS++))
        fi
        ;;

    "launch-production")
        echo "Checking Launch → Production criteria:"
        echo -n "  Production environment ready: "
        if [ -f ".env.production" ] || grep -q "production" .github/workflows/*.yml 2>/dev/null; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Configure production environment"
            ((ERRORS++))
        fi

        echo -n "  Monitoring active: "
        # Check for monitoring configuration
        if grep -r "sentry\|datadog\|newrelic\|applicationinsights" --include="*.json" --include="*.env*" . 2>/dev/null | grep -q .; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Configure monitoring tools"
            ((ERRORS++))
        fi

        echo -n "  Deployment runbook: "
        if [ -f "workflows/deployment-runbook.md" ] || [ -f "DEPLOYMENT.md" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
            echo "    Create deployment runbook"
            ((ERRORS++))
        fi

        if ! check_github_green; then
            ((ERRORS++))
        fi
        ;;

    *)
        echo -e "${YELLOW}⚠${NC} No specific criteria defined for this transition"
        echo "Transition allowed by default"
        exit 0
        ;;
esac

echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ Cannot transition: $ERRORS criteria not met${NC}"
    echo ""
    echo "Complete the missing criteria above, or to override:"
    echo "  Edit .workflow-config.json: {\"enforcePhaseTransitions\": false}"
    echo "  Or use Claude AI: 'override phase transition' (requires reason)"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ All criteria met - ready to transition to $NEXT_PHASE phase${NC}"
    exit 0
fi
