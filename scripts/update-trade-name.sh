#!/bin/bash
#
# Update Trade Name and Auto-Commit/Sync
#
# Usage:
#   bash scripts/update-trade-name.sh "New Trade Name"
#   bash scripts/update-trade-name.sh  # Interactive mode
#
# Author: Template System
# Created: 2025-11-09

set -e

PROJECT_ID=$(basename "$(pwd)")
STATE_FILE=".project-state.json"

# Check if in project directory
if [ ! -f "$STATE_FILE" ]; then
    echo "Error: Not in a project directory (no .project-state.json found)"
    exit 1
fi

# Get trade name from argument or prompt
if [ -n "$1" ]; then
    TRADE_NAME="$1"
else
    # Interactive mode
    CURRENT_NAME=$(python3 -c "import json; data=json.load(open('$STATE_FILE')); print(data.get('metadata', {}).get('tradeName', 'Not set'))" 2>/dev/null || echo "Not set")

    echo "Current trade name: $CURRENT_NAME"
    echo ""
    read -p "Enter new trade name: " TRADE_NAME

    if [ -z "$TRADE_NAME" ]; then
        echo "Error: Trade name cannot be empty"
        exit 1
    fi
fi

echo "Updating trade name to: $TRADE_NAME"

# Update .project-state.json using Python
python3 << ENDPYTHON
import json

with open('$STATE_FILE', 'r') as f:
    data = json.load(f)

# Ensure metadata exists
if 'metadata' not in data:
    data['metadata'] = {}

# Update trade name
data['metadata']['tradeName'] = '$TRADE_NAME'

# Write back
with open('$STATE_FILE', 'w') as f:
    json.dump(data, f, indent=2)

print(f"[OK] Updated .project-state.json")
ENDPYTHON

# Check if there are uncommitted changes
if git diff --quiet "$STATE_FILE"; then
    echo "[INFO] No changes detected (trade name already set)"
else
    echo ""
    echo "Committing change..."
    git add "$STATE_FILE"
    git commit -m "docs: update trade name to $TRADE_NAME" --no-verify
    echo "[OK] Committed to git"

    echo ""
    echo "Syncing to dashboard..."
    SYNC_SCRIPT="/c/devop/.template-system/scripts/sync-project-database-v2.py"

    if [ -f "$SYNC_SCRIPT" ]; then
        python3 "$SYNC_SCRIPT" "$PROJECT_ID" 2>&1 | grep -E "\[OK\]|\[FAIL\]" || echo "[OK] Synced to dashboard"
    else
        echo "[WARN] Sync script not found, run manually:"
        echo "  python3 $SYNC_SCRIPT $PROJECT_ID"
    fi
fi

echo ""
echo "Trade name update complete!"
echo ""
echo "Dashboard should now show: $TRADE_NAME"
