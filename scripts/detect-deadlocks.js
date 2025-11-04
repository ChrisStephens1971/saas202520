#!/usr/bin/env node
/**
 * Deadlock Detection for Multi-Agent Swarm
 * v2.1.2 - Detects circular dependencies between agents
 */

const fs = require('fs').promises;
const path = require('path');

class DeadlockDetector {
  constructor() {
    this.statusDir = path.join(process.cwd(), 'agent-status');
    this.agents = new Map();
    this.dependencies = new Map();
  }

  async loadAgentStatus() {
    try {
      const files = await fs.readdir(this.statusDir);

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('cost-tracking')) {
          const filePath = path.join(this.statusDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const agent = JSON.parse(content);

            if (agent.agentId && agent.status === 'blocked') {
              this.agents.set(agent.agentId, agent);

              // Build dependency graph
              if (agent.blockedBy) {
                if (!this.dependencies.has(agent.agentId)) {
                  this.dependencies.set(agent.agentId, []);
                }
                this.dependencies.get(agent.agentId).push(agent.blockedBy);
              }
            }
          } catch (error) {
            console.error(`Error reading ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading status directory: ${error.message}`);
    }
  }

  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat(node);
        cycles.push(cycle);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.dependencies.get(node) || [];
      for (const dep of deps) {
        if (dfs(dep, [...path])) {
          // Cycle detected in subtree
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // Check all nodes
    for (const [agentId] of this.agents) {
      if (!visited.has(agentId)) {
        dfs(agentId);
      }
    }

    return cycles;
  }

  async detectDeadlocks() {
    console.log('🔍 Checking for deadlocks...\n');

    await this.loadAgentStatus();

    if (this.agents.size === 0) {
      console.log('✅ No blocked agents found');
      return { deadlocked: false, cycles: [], blocked: [] };
    }

    console.log(`Found ${this.agents.size} blocked agent(s)`);

    // List blocked agents
    const blockedAgents = [];
    for (const [agentId, agent] of this.agents) {
      blockedAgents.push({
        agentId,
        blockedBy: agent.blockedBy,
        reason: agent.reason || 'Unknown',
        duration: this.calculateBlockedDuration(agent)
      });

      console.log(`  - ${agentId} blocked by ${agent.blockedBy || 'unknown'}`);
      if (agent.reason) {
        console.log(`    Reason: ${agent.reason}`);
      }
    }

    // Detect cycles (deadlocks)
    const cycles = this.detectCycles();

    if (cycles.length > 0) {
      console.log('\n🚨 DEADLOCKS DETECTED!\n');

      for (let i = 0; i < cycles.length; i++) {
        const cycle = cycles[i];
        console.log(`Deadlock #${i + 1}:`);
        console.log(`  ${cycle.join(' → ')}`);

        // Suggest resolution
        console.log(`  Suggested resolution:`);
        console.log(`    1. Cancel one of the blocked tasks`);
        console.log(`    2. Or manually complete the blocking dependency`);
      }

      await this.createDeadlockReport(cycles, blockedAgents);
      return { deadlocked: true, cycles, blocked: blockedAgents };
    } else {
      console.log('\n✅ No deadlocks detected');

      // Check for long-running blocks
      const longBlocks = blockedAgents.filter(a => {
        const duration = parseInt(a.duration) || 0;
        return duration > 3600; // More than 1 hour
      });

      if (longBlocks.length > 0) {
        console.log('\n⚠️ Long-running blocks detected:');
        for (const block of longBlocks) {
          console.log(`  - ${block.agentId} blocked for ${this.formatDuration(block.duration)}`);
        }
        console.log('\nConsider investigating these blocks');
      }

      return { deadlocked: false, cycles: [], blocked: blockedAgents };
    }
  }

  calculateBlockedDuration(agent) {
    if (!agent.blockedAt) return 0;

    try {
      const blockedAt = new Date(agent.blockedAt);
      const now = new Date();
      return Math.floor((now - blockedAt) / 1000); // Duration in seconds
    } catch (error) {
      return 0;
    }
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  async createDeadlockReport(cycles, blockedAgents) {
    const report = {
      timestamp: new Date().toISOString(),
      deadlocksFound: cycles.length,
      cycles: cycles,
      blockedAgents: blockedAgents,
      recommendations: []
    };

    // Generate recommendations
    for (const cycle of cycles) {
      report.recommendations.push({
        type: 'deadlock',
        agents: cycle,
        action: 'Break cycle by canceling or manually completing one task',
        priority: 'critical'
      });
    }

    // Check for resource starvation
    const laneCounts = {};
    for (const agent of blockedAgents) {
      const lane = agent.lane || 'unknown';
      laneCounts[lane] = (laneCounts[lane] || 0) + 1;
    }

    for (const [lane, count] of Object.entries(laneCounts)) {
      if (count >= 3) {
        report.recommendations.push({
          type: 'congestion',
          lane: lane,
          blockedCount: count,
          action: `Consider increasing capacity for ${lane} lane`,
          priority: 'high'
        });
      }
    }

    // Save report
    const reportPath = path.join(this.statusDir, 'deadlock-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Create GitHub issue if deadlock found
    if (cycles.length > 0) {
      await this.createGitHubIssue(report);
    }

    return report;
  }

  async createGitHubIssue(report) {
    try {
      const { execSync } = require('child_process');

      const issueTitle = `[DEADLOCK] ${report.cycles.length} deadlock(s) detected in agent swarm`;

      let issueBody = `## 🚨 Deadlock Detection Report\n\n`;
      issueBody += `**Time:** ${report.timestamp}\n`;
      issueBody += `**Deadlocks Found:** ${report.deadlocksFound}\n\n`;

      issueBody += `### Cycles Detected\n\n`;
      for (let i = 0; i < report.cycles.length; i++) {
        issueBody += `${i + 1}. ${report.cycles[i].join(' → ')}\n`;
      }

      issueBody += `\n### Blocked Agents\n\n`;
      issueBody += `| Agent | Blocked By | Reason | Duration |\n`;
      issueBody += `|-------|------------|--------|----------|\n`;

      for (const agent of report.blockedAgents) {
        issueBody += `| ${agent.agentId} | ${agent.blockedBy || '-'} | `;
        issueBody += `${agent.reason} | ${this.formatDuration(agent.duration)} |\n`;
      }

      issueBody += `\n### Recommendations\n\n`;
      for (const rec of report.recommendations) {
        issueBody += `- **${rec.priority.toUpperCase()}:** ${rec.action}\n`;
      }

      issueBody += `\n---\n*This issue was automatically created by the deadlock detector*`;

      // Create issue using GitHub CLI
      const command = `gh issue create --title "${issueTitle}" --body "${issueBody.replace(/"/g, '\\"')}" --label "deadlock,urgent"`;

      const result = execSync(command, { encoding: 'utf8' });
      console.log(`\n✅ GitHub issue created: ${result.trim()}`);
    } catch (error) {
      console.error(`\n❌ Failed to create GitHub issue: ${error.message}`);
    }
  }

  async monitorContinuously(intervalSeconds = 60) {
    console.log(`🔄 Starting continuous deadlock monitoring (checking every ${intervalSeconds}s)\n`);

    const check = async () => {
      const result = await this.detectDeadlocks();

      if (result.deadlocked) {
        console.log('\n🚨 ACTION REQUIRED: Deadlocks need resolution!\n');
      }

      console.log(`\nNext check in ${intervalSeconds} seconds...\n`);
      console.log('═══════════════════════════════════════\n');
    };

    // Initial check
    await check();

    // Set up interval
    setInterval(check, intervalSeconds * 1000);
  }
}

// CLI usage
async function main() {
  const detector = new DeadlockDetector();
  const command = process.argv[2];

  switch (command) {
    case 'check':
      // One-time check
      const result = await detector.detectDeadlocks();
      process.exit(result.deadlocked ? 1 : 0);
      break;

    case 'monitor':
      // Continuous monitoring
      const interval = parseInt(process.argv[3]) || 60;
      await detector.monitorContinuously(interval);
      break;

    default:
      console.log('Usage:');
      console.log('  node detect-deadlocks.js check              # One-time check');
      console.log('  node detect-deadlocks.js monitor [seconds]  # Continuous monitoring');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeadlockDetector;