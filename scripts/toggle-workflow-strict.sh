#!/usr/bin/env bash
# Toggle Workflow Strict Mode
# Usage: ./toggle-workflow-strict.sh [enable|disable|status]

set -euo pipefail

WORKFLOW_CONFIG=".workflow-config.json"

# Check if config file exists
if [ ! -f "$WORKFLOW_CONFIG" ]; then
    echo "Error: $WORKFLOW_CONFIG not found"
    echo "Creating default configuration..."
    cat > "$WORKFLOW_CONFIG" << 'EOF'
{
  "version": "1.0",
  "strictMode": true,
  "enforcePhaseTransitions": true,
  "enforceDailyPractices": true,
  "allowOverrides": true,
  "requireOverrideReasons": true
}
EOF
    echo "Created $WORKFLOW_CONFIG with strict mode enabled"
    exit 0
fi

# Function to show current status
show_status() {
    STRICT_MODE=$(jq -r '.strictMode' "$WORKFLOW_CONFIG")
    ENFORCE_TRANSITIONS=$(jq -r '.enforcePhaseTransitions' "$WORKFLOW_CONFIG")
    ENFORCE_DAILY=$(jq -r '.enforceDailyPractices' "$WORKFLOW_CONFIG")

    echo "=== Workflow Strict Mode Status ==="
    echo ""
    echo "Strict Mode: $STRICT_MODE"
    echo "Enforce Phase Transitions: $ENFORCE_TRANSITIONS"
    echo "Enforce Daily Practices: $ENFORCE_DAILY"
    echo ""

    if [ "$STRICT_MODE" = "true" ]; then
        echo "Status: STRICT (workflow rules enforced)"
        echo ""
        echo "What's enforced:"
        echo "  - Phase transitions must meet criteria"
        echo "  - Daily practices required (GitHub health check)"
        echo "  - Git hooks validate before commit/push"
        echo ""
        echo "To disable: ./scripts/toggle-workflow-strict.sh disable"
    else
        echo "Status: FLEXIBLE (workflow rules optional)"
        echo ""
        echo "What's relaxed:"
        echo "  - Phase transitions allowed without validation"
        echo "  - Daily practices not enforced"
        echo "  - Git hooks don't block"
        echo ""
        echo "To enable: ./scripts/toggle-workflow-strict.sh enable"
    fi
}

# Function to enable strict mode
enable_strict() {
    jq '.strictMode = true | .enforcePhaseTransitions = true | .enforceDailyPractices = true' \
        "$WORKFLOW_CONFIG" > "$WORKFLOW_CONFIG.tmp"
    mv "$WORKFLOW_CONFIG.tmp" "$WORKFLOW_CONFIG"

    echo "✅ Strict mode ENABLED"
    echo ""
    echo "Workflow rules now enforced:"
    echo "  - Phase transitions validated"
    echo "  - Daily practices required"
    echo "  - Git hooks block invalid operations"
    echo ""
    echo "View status: ./scripts/toggle-workflow-strict.sh status"
}

# Function to disable strict mode
disable_strict() {
    jq '.strictMode = false | .enforcePhaseTransitions = false | .enforceDailyPractices = false' \
        "$WORKFLOW_CONFIG" > "$WORKFLOW_CONFIG.tmp"
    mv "$WORKFLOW_CONFIG.tmp" "$WORKFLOW_CONFIG"

    echo "✅ Strict mode DISABLED"
    echo ""
    echo "Workflow rules now optional:"
    echo "  - Phase transitions allowed without validation"
    echo "  - Daily practices not enforced"
    echo "  - Git hooks don't block"
    echo ""
    echo "⚠️  WARNING: Disabling strict mode may lead to:"
    echo "  - Skipped quality gates"
    echo "  - Technical debt accumulation"
    echo "  - Reduced project discipline"
    echo ""
    echo "Re-enable when ready: ./scripts/toggle-workflow-strict.sh enable"
}

# Main logic
ACTION=${1:-status}

case "$ACTION" in
    enable)
        enable_strict
        ;;
    disable)
        disable_strict
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 [enable|disable|status]"
        echo ""
        echo "Commands:"
        echo "  enable   - Enable strict workflow enforcement"
        echo "  disable  - Disable strict workflow enforcement"
        echo "  status   - Show current configuration"
        exit 1
        ;;
esac
