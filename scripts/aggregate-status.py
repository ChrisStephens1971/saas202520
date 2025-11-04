#!/usr/bin/env python3
"""
Aggregate agent status files into AGENT-STATUS.md
v2.1.2 - Safe handling of empty directories and failures
"""
import json
import glob
import os
from datetime import datetime, timezone
from pathlib import Path

def safe_json_load(filepath):
    """Safely load JSON with error handling"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Could not read {filepath}: {e}")
        return None

def create_system_status():
    """Create initial system status if missing"""
    return {
        "agentId": "system",
        "type": "system",
        "status": "idle",
        "lastUpdate": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "message": "System initialized. Waiting for first coordinator run."
    }

def aggregate_status():
    """Main aggregation function with v2.1.2 safety features"""

    # v2.1.2: Handle empty directory gracefully
    status_dir = Path('agent-status')
    if not status_dir.exists():
        print("Creating agent-status directory...")
        status_dir.mkdir(parents=True, exist_ok=True)

        # Create system status as placeholder
        system_status = create_system_status()
        system_file = status_dir / 'system.json'
        with open(system_file, 'w', encoding='utf-8') as f:
            json.dump(system_status, f, indent=2)
        print(f"Created {system_file}")

    # Load all agent status files
    agents = []
    status_files = list(status_dir.glob('*.json'))

    if not status_files:
        print("No agent status files found, creating empty status board")
        # Create system status if nothing exists
        system_status = create_system_status()
        system_file = status_dir / 'system.json'
        with open(system_file, 'w', encoding='utf-8') as f:
            json.dump(system_status, f, indent=2)
        agents.append(system_status)
    else:
        for filepath in status_files:
            agent_data = safe_json_load(filepath)
            if agent_data:
                agents.append(agent_data)

    # Sort by status priority
    priority = {
        'in_progress': 0,
        'blocked': 1,
        'waiting': 2,
        'idle': 3,
        'completed': 4
    }
    agents.sort(key=lambda a: (
        priority.get(a.get('status', 'idle'), 5),
        a.get('agentId', 'unknown')
    ))

    # Generate markdown status board
    with open('AGENT-STATUS.md', 'w', encoding='utf-8') as f:
        f.write("# 🤖 Agent Status Board\n")
        f.write(f"**Last Updated:** {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}\n")
        f.write(f"**Total Agents:** {len(agents)}\n\n")

        # Active work section
        active = [a for a in agents if a.get('status') not in ['idle', 'completed']]
        if active:
            f.write("## 🚀 Active Work\n\n")
            f.write("| Agent | Status | Task | Branch | Started | Duration |\n")
            f.write("|-------|--------|------|--------|---------|----------|\n")

            for agent in active:
                # Calculate duration if started time exists
                duration = "-"
                if agent.get('started'):
                    try:
                        started = datetime.fromisoformat(agent['started'].replace('Z', '+00:00'))
                        duration = str(datetime.now(timezone.utc) - started).split('.')[0]
                    except:
                        duration = "-"

                # Status emoji
                status_emoji = {
                    'in_progress': '🔄',
                    'blocked': '🚫',
                    'waiting': '⏳'
                }.get(agent.get('status', 'idle'), '❓')

                f.write(f"| {agent.get('agentId', 'unknown')} | "
                       f"{status_emoji} {agent.get('status', 'unknown')} | "
                       f"{agent.get('task', '-')[:30]} | "
                       f"`{agent.get('branch', '-')[:20]}` | "
                       f"{agent.get('started', '-')[:16]} | "
                       f"{duration} |\n")

        # Blocked agents section
        blocked = [a for a in agents if a.get('status') == 'blocked']
        if blocked:
            f.write("\n## 🚫 Blocked Agents\n\n")
            f.write("| Agent | Blocked By | Reason | Duration |\n")
            f.write("|-------|------------|--------|----------|\n")

            for agent in blocked:
                f.write(f"| {agent.get('agentId', 'unknown')} | "
                       f"{agent.get('blockedBy', '-')} | "
                       f"{agent.get('reason', '-')[:40]} | "
                       f"{agent.get('blockedDuration', '-')} |\n")

        # Idle agents section
        idle = [a for a in agents if a.get('status') == 'idle']
        if idle:
            f.write("\n## 💤 Idle Agents\n\n")
            f.write("| Agent | Last Active | Ready For |\n")
            f.write("|-------|-------------|----------|\n")

            for agent in idle:
                f.write(f"| {agent.get('agentId', 'unknown')} | "
                       f"{agent.get('lastUpdate', '-')[:16]} | "
                       f"{agent.get('readyFor', 'Any task')} |\n")

        # Recent completions
        completed = [a for a in agents if a.get('status') == 'completed']
        if completed:
            f.write("\n## ✅ Recent Completions\n\n")
            f.write("| Agent | Task | Completed | Duration |\n")
            f.write("|-------|------|-----------|----------|\n")

            # Show only last 5 completions
            for agent in completed[:5]:
                f.write(f"| {agent.get('agentId', 'unknown')} | "
                       f"{agent.get('task', '-')[:30]} | "
                       f"{agent.get('completed', '-')[:16]} | "
                       f"{agent.get('duration', '-')} |\n")

        # Statistics section
        f.write("\n## 📊 Statistics\n\n")
        f.write(f"- **Active:** {len(active)}\n")
        f.write(f"- **Blocked:** {len(blocked)}\n")
        f.write(f"- **Idle:** {len(idle)}\n")
        f.write(f"- **Completed (recent):** {len(completed)}\n")

        # Lane utilization
        lanes = {}
        for agent in agents:
            lane = agent.get('lane', 'unknown')
            if lane not in lanes:
                lanes[lane] = {'active': 0, 'idle': 0, 'blocked': 0}

            status = agent.get('status', 'idle')
            if status in ['in_progress', 'waiting']:
                lanes[lane]['active'] += 1
            elif status == 'blocked':
                lanes[lane]['blocked'] += 1
            else:
                lanes[lane]['idle'] += 1

        if lanes:
            f.write("\n### Lane Utilization\n\n")
            f.write("| Lane | Active | Blocked | Idle | Total |\n")
            f.write("|------|--------|---------|------|-------|\n")

            for lane, stats in sorted(lanes.items()):
                total = stats['active'] + stats['blocked'] + stats['idle']
                f.write(f"| {lane} | {stats['active']} | {stats['blocked']} | "
                       f"{stats['idle']} | {total} |\n")

    print(f"[SUCCESS] Status board updated: AGENT-STATUS.md")
    print(f"   - {len(active)} active agents")
    print(f"   - {len(blocked)} blocked agents")
    print(f"   - {len(idle)} idle agents")

if __name__ == '__main__':
    try:
        aggregate_status()
    except Exception as e:
        print(f"Error aggregating status: {e}")
        # Create minimal status board on error
        with open('AGENT-STATUS.md', 'w', encoding='utf-8') as f:
            f.write("# 🤖 Agent Status Board\n")
            f.write(f"**Error:** Could not aggregate status - {e}\n")
            f.write(f"**Last Attempt:** {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}\n")
        exit(1)