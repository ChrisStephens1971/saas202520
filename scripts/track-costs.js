#!/usr/bin/env node
/**
 * Cost Tracking Script for Multi-Agent Swarm
 * v2.1.2 - With PR notifications and budget alerts
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Model pricing (per 1M tokens)
const PRICING = {
  'haiku': { input: 0.25, output: 1.25 },
  'sonnet': { input: 3.00, output: 15.00 },
  'opus': { input: 15.00, output: 75.00 }
};

// Average tokens per operation
const TOKENS_PER_OP = {
  'simple': { input: 1000, output: 500 },
  'moderate': { input: 3000, output: 2000 },
  'complex': { input: 8000, output: 5000 }
};

class CostTracker {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.costFilePath = path.join(process.cwd(), 'agent-status', 'cost-tracking.json');
    this.config = null;
    this.costData = null;
  }

  async initialize() {
    // Load config
    const configContent = await fs.readFile(this.configPath, 'utf8');
    this.config = JSON.parse(configContent);

    // Load or create cost tracking file
    try {
      const costContent = await fs.readFile(this.costFilePath, 'utf8');
      this.costData = JSON.parse(costContent);
    } catch (error) {
      // Initialize new cost tracking
      this.costData = {
        month: new Date().toISOString().substring(0, 7),
        totalCost: 0,
        byLane: {},
        byAgent: {},
        byDay: {},
        operations: []
      };
    }

    // Reset if new month
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (this.costData.month !== currentMonth) {
      this.costData = {
        month: currentMonth,
        totalCost: 0,
        byLane: {},
        byAgent: {},
        byDay: {},
        operations: []
      };
    }
  }

  async trackOperation(agentId, lane, model, complexity = 'moderate') {
    const tokens = TOKENS_PER_OP[complexity];
    const pricing = PRICING[model] || PRICING['haiku'];

    const inputCost = (tokens.input / 1000000) * pricing.input;
    const outputCost = (tokens.output / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const operation = {
      timestamp: new Date().toISOString(),
      agentId,
      lane,
      model,
      complexity,
      tokens,
      cost: totalCost
    };

    // Update totals
    this.costData.totalCost += totalCost;

    // Update by lane
    if (!this.costData.byLane[lane]) {
      this.costData.byLane[lane] = { cost: 0, operations: 0 };
    }
    this.costData.byLane[lane].cost += totalCost;
    this.costData.byLane[lane].operations += 1;

    // Update by agent
    if (!this.costData.byAgent[agentId]) {
      this.costData.byAgent[agentId] = { cost: 0, operations: 0 };
    }
    this.costData.byAgent[agentId].cost += totalCost;
    this.costData.byAgent[agentId].operations += 1;

    // Update by day
    const today = new Date().toISOString().substring(0, 10);
    if (!this.costData.byDay[today]) {
      this.costData.byDay[today] = { cost: 0, operations: 0 };
    }
    this.costData.byDay[today].cost += totalCost;
    this.costData.byDay[today].operations += 1;

    // Keep last 1000 operations
    this.costData.operations.push(operation);
    if (this.costData.operations.length > 1000) {
      this.costData.operations = this.costData.operations.slice(-1000);
    }

    // Save data
    await this.save();

    // Check budget alerts
    await this.checkBudgetAlerts();

    return operation;
  }

  async checkBudgetAlerts() {
    const budget = this.config.cost.budgetPerMonth;
    const percent = (this.costData.totalCost / budget) * 100;

    for (const alert of this.config.cost.alerts) {
      if (percent >= alert.threshold && !this.costData[`alert_${alert.threshold}_sent`]) {
        await this.handleAlert(alert, percent);
        this.costData[`alert_${alert.threshold}_sent`] = true;
      }
    }
  }

  async handleAlert(alert, percent) {
    const budget = this.config.cost.budgetPerMonth;
    const totalCost = this.costData.totalCost;

    console.log(`⚠️ Cost Alert: ${percent.toFixed(1)}% of budget used ($${totalCost.toFixed(2)}/$${budget})`);

    // Log alert
    if (alert.action === 'log') {
      await this.logAlert(percent, totalCost, budget);
    }

    // Slack notification
    if (alert.action.includes('slack') && alert.webhook) {
      await this.sendSlackAlert(alert.webhook, percent, totalCost, budget);
    }

    // v2.1.2: Comment on active PRs when paused
    if (alert.notifyPR && alert.action.includes('pause')) {
      await this.notifyActivePRs(percent, totalCost, budget, alert.action);
    }

    // Pause agents
    if (alert.action.includes('pause')) {
      await this.pauseAgents(alert.action);
    }
  }

  async notifyActivePRs(percent, totalCost, budget, action) {
    try {
      // Get list of open PRs
      const prs = execSync('gh pr list --json number,title,labels', {
        encoding: 'utf8'
      });
      const prList = JSON.parse(prs);

      // Filter for agent-created PRs (have lane labels)
      const agentPRs = prList.filter(pr =>
        pr.labels.some(label => label.name.startsWith('lane:'))
      );

      const pauseType = action.includes('all') ? 'ALL agents' : 'non-critical agents';

      const message = `## 🚨 Cost Alert: Budget Threshold Reached

**Current Usage:** $${totalCost.toFixed(2)} / $${budget} (${percent.toFixed(1)}%)
**Action Taken:** ${pauseType} have been paused

### Impact on This PR
- ⏸️ Automated updates are paused
- 👤 Human review required to proceed
- 💰 Budget review needed before reactivation

### Next Steps
1. Review current month's usage
2. Approve additional budget if needed
3. Reactivate agents via coordinator

*This is an automated message from the cost tracking system*`;

      // Comment on each PR
      for (const pr of agentPRs) {
        try {
          execSync(`gh pr comment ${pr.number} --body "${message.replace(/"/g, '\\"')}"`, {
            encoding: 'utf8'
          });
          console.log(`   ✅ Notified PR #${pr.number}`);
        } catch (error) {
          console.error(`   ❌ Failed to notify PR #${pr.number}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`Failed to notify PRs: ${error.message}`);
    }
  }

  async pauseAgents(action) {
    // Update agent status files to paused state
    const statusDir = path.join(process.cwd(), 'agent-status');
    const files = await fs.readdir(statusDir);

    for (const file of files) {
      if (file.endsWith('.json') && file !== 'cost-tracking.json') {
        const filePath = path.join(statusDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const agent = JSON.parse(content);

          // Determine if agent should be paused
          let shouldPause = false;
          if (action === 'pause-all') {
            shouldPause = true;
          } else if (action === 'pause-non-critical') {
            // Keep critical agents running (contracts, migrations)
            shouldPause = !['contracts', 'migrations'].includes(agent.lane);
          }

          if (shouldPause && agent.status !== 'paused') {
            agent.previousStatus = agent.status;
            agent.status = 'paused';
            agent.pausedReason = 'budget-threshold';
            agent.pausedAt = new Date().toISOString();

            await fs.writeFile(filePath, JSON.stringify(agent, null, 2));
            console.log(`   ⏸️ Paused agent: ${agent.agentId}`);
          }
        } catch (error) {
          console.error(`   Failed to pause agent ${file}: ${error.message}`);
        }
      }
    }
  }

  async sendSlackAlert(webhook, percent, totalCost, budget) {
    if (!webhook || webhook === 'SLACK_WEBHOOK_URL') {
      console.log('   ⚠️ Slack webhook not configured');
      return;
    }

    const message = {
      text: `🚨 Agent Swarm Cost Alert: ${percent.toFixed(1)}% of monthly budget used`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Agent Swarm Cost Alert*\n\n` +
                  `Current spend: $${totalCost.toFixed(2)}\n` +
                  `Budget: $${budget}\n` +
                  `Utilization: ${percent.toFixed(1)}%\n\n` +
                  (percent >= 90 ? '⚠️ Non-critical agents paused\n' : '') +
                  (percent >= 100 ? '🛑 All agents paused\n' : '')
          }
        }
      ]
    };

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        console.log('   ✅ Slack notification sent');
      }
    } catch (error) {
      console.error(`   ❌ Failed to send Slack alert: ${error.message}`);
    }
  }

  async logAlert(percent, totalCost, budget) {
    const alertLog = path.join(process.cwd(), 'agent-status', 'cost-alerts.log');
    const logEntry = `${new Date().toISOString()} - ${percent.toFixed(1)}% - $${totalCost.toFixed(2)}/$${budget}\n`;
    await fs.appendFile(alertLog, logEntry);
  }

  async save() {
    await fs.writeFile(this.costFilePath, JSON.stringify(this.costData, null, 2));
  }

  async generateReport() {
    const budget = this.config.cost.budgetPerMonth;
    const percent = (this.costData.totalCost / budget) * 100;

    console.log('\n📊 Cost Report');
    console.log('═══════════════════════════════════════');
    console.log(`Month: ${this.costData.month}`);
    console.log(`Total Cost: $${this.costData.totalCost.toFixed(2)} / $${budget} (${percent.toFixed(1)}%)`);

    console.log('\n💰 Cost by Lane:');
    for (const [lane, data] of Object.entries(this.costData.byLane)) {
      const avgCost = data.cost / data.operations;
      console.log(`  ${lane}: $${data.cost.toFixed(2)} (${data.operations} ops, avg: $${avgCost.toFixed(3)})`);
    }

    console.log('\n🤖 Top 5 Agents by Cost:');
    const sortedAgents = Object.entries(this.costData.byAgent)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 5);

    for (const [agent, data] of sortedAgents) {
      console.log(`  ${agent}: $${data.cost.toFixed(2)} (${data.operations} ops)`);
    }

    console.log('\n📅 Last 7 Days:');
    const days = Object.keys(this.costData.byDay).slice(-7);
    for (const day of days) {
      const data = this.costData.byDay[day];
      console.log(`  ${day}: $${data.cost.toFixed(2)} (${data.operations} ops)`);
    }

    // Budget status
    console.log('\n⚠️ Budget Status:');
    if (percent < 50) {
      console.log('  ✅ Healthy - Under 50% of budget');
    } else if (percent < 80) {
      console.log('  ⚠️ Monitor - Approaching 80% threshold');
    } else if (percent < 90) {
      console.log('  🚨 Warning - Approaching pause threshold');
    } else if (percent < 100) {
      console.log('  🛑 Critical - Non-critical agents paused');
    } else {
      console.log('  💀 Over Budget - All agents paused');
    }
  }
}

// CLI usage
async function main() {
  const tracker = new CostTracker();
  await tracker.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'track':
      // Track an operation
      // Usage: node track-costs.js track <agentId> <lane> <model> [complexity]
      const [, , , agentId, lane, model, complexity = 'moderate'] = process.argv;
      const op = await tracker.trackOperation(agentId, lane, model, complexity);
      console.log(`✅ Tracked: ${agentId} - $${op.cost.toFixed(3)}`);
      break;

    case 'report':
      // Generate report
      await tracker.generateReport();
      break;

    case 'check':
      // Check budget alerts
      await tracker.checkBudgetAlerts();
      console.log('✅ Budget alerts checked');
      break;

    default:
      console.log('Usage:');
      console.log('  node track-costs.js track <agentId> <lane> <model> [complexity]');
      console.log('  node track-costs.js report');
      console.log('  node track-costs.js check');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CostTracker;