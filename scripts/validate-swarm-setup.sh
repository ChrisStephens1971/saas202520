#!/bin/bash
#
# Swarm Setup Validation Script
# Checks that all components are correctly configured
#

set -e

echo "🔍 Validating Multi-Agent Swarm Setup..."
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Check 1: Core files exist
echo "1. Checking core files..."
if [ -f "config.json" ]; then
    success "config.json exists"
else
    error "config.json not found"
fi

if [ -f "CODEOWNERS" ]; then
    success "CODEOWNERS exists"
else
    error "CODEOWNERS not found"
fi

if [ -d "agent-status" ]; then
    success "agent-status directory exists"
else
    error "agent-status directory not found"
fi

# Check 2: Scripts are executable
echo ""
echo "2. Checking scripts..."
for script in scripts/aggregate-status.py scripts/track-costs.js scripts/detect-deadlocks.js; do
    if [ -f "$script" ]; then
        success "$script exists"
    else
        error "$script not found"
    fi
done

# Check 3: Workflows exist
echo ""
echo "3. Checking GitHub workflows..."
for workflow in coordinator contract-worker backend-worker frontend-worker test-worker reviewer-merger; do
    if [ -f ".github/workflows/$workflow.yml" ]; then
        success "$workflow.yml exists"
    else
        error "$workflow.yml not found"
    fi
done

# Check 4: Configuration validation
echo ""
echo "4. Validating configuration..."
if command -v jq &> /dev/null; then
    # Check config.json is valid JSON
    if jq empty config.json 2>/dev/null; then
        success "config.json is valid JSON"

        # Check required fields
        if jq -e '.agents.coordinator' config.json > /dev/null; then
            success "Coordinator config present"
        else
            error "Coordinator config missing"
        fi

        if jq -e '.cost.budgetPerMonth' config.json > /dev/null; then
            success "Cost budget configured"
        else
            warning "Cost budget not configured"
        fi

        if jq -e '.lanes' config.json > /dev/null; then
            LANE_COUNT=$(jq '.lanes | length' config.json)
            success "Lanes configured: $LANE_COUNT"
        else
            error "Lanes not configured"
        fi
    else
        error "config.json is not valid JSON"
    fi
else
    warning "jq not installed, skipping JSON validation"
fi

# Check 5: Python dependencies
echo ""
echo "5. Checking Python..."
if command -v python &> /dev/null; then
    success "Python is installed"

    # Test status script
    if python scripts/aggregate-status.py &> /dev/null; then
        success "Status aggregation script works"
    else
        error "Status aggregation script failed"
    fi
else
    error "Python not installed"
fi

# Check 6: Node.js dependencies
echo ""
echo "6. Checking Node.js..."
if command -v node &> /dev/null; then
    success "Node.js is installed"

    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        success "Dependencies installed"
    else
        warning "node_modules not found - run: pnpm install"
    fi
else
    error "Node.js not installed"
fi

# Check 7: Documentation
echo ""
echo "7. Checking documentation..."
for doc in docs/SWARM-RUNBOOK.md docs/MULTI-TENANT-SWARM-GUIDE.md docs/AGENT-ONBOARDING.md; do
    if [ -f "$doc" ]; then
        success "$doc exists"
    else
        error "$doc not found"
    fi
done

# Check 8: Test structure
echo ""
echo "8. Checking test structure..."
if [ -d "tests/contracts" ] && [ -d "tests/e2e" ] && [ -d "tests/fixtures" ]; then
    success "Test directories exist"
else
    warning "Some test directories missing"
fi

# Check 9: API contracts
echo ""
echo "9. Checking API contracts..."
if [ -f "packages/api-contracts/openapi.yaml" ]; then
    success "OpenAPI spec exists"
else
    warning "OpenAPI spec not found"
fi

# Check 10: Git configuration
echo ""
echo "10. Checking Git..."
if [ -d ".git" ]; then
    success "Git repository initialized"

    # Check for remote
    if git remote get-url origin &> /dev/null; then
        REMOTE=$(git remote get-url origin)
        success "Remote configured: $REMOTE"
    else
        warning "No git remote configured"
    fi
else
    error "Not a git repository"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create a test ticket in GitHub Projects"
    echo "2. Run: gh workflow run coordinator.yml"
    echo "3. Monitor: cat AGENT-STATUS.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo "System is functional but review warnings above."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix errors before using the swarm system."
    exit 1
fi