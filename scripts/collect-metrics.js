#!/usr/bin/env node
/**
 * Simple Metrics Collection for Multi-Agent Swarm
 * Collects basic metrics without complex dependencies
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MetricsCollector {
  constructor() {
    this.metricsFile = path.join(process.cwd(), 'agent-status', 'metrics.json');
  }

  async collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      agents: await this.getAgentMetrics(),
      prs: await this.getPRMetrics(),
      costs: await this.getCostMetrics(),
    };

    await this.saveMetrics(metrics);
    return metrics;
  }

  async getAgentMetrics() {
    try {
      const statusDir = path.join(process.cwd(), 'agent-status');
      const files = await fs.readdir(statusDir);

      let active = 0;
      let idle = 0;
      let blocked = 0;

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('metrics') && !file.includes('cost')) {
          const content = await fs.readFile(path.join(statusDir, file), 'utf8');
          const agent = JSON.parse(content);

          if (agent.status === 'in_progress' || agent.status === 'assigned') {
            active++;
          } else if (agent.status === 'blocked') {
            blocked++;
          } else {
            idle++;
          }
        }
      }

      return { active, idle, blocked, total: active + idle + blocked };
    } catch (error) {
      console.error('Error collecting agent metrics:', error.message);
      return { active: 0, idle: 0, blocked: 0, total: 0 };
    }
  }

  async getPRMetrics() {
    try {
      const openPRs = execSync('gh pr list --json number,title,createdAt,labels', {
        encoding: 'utf8',
      });

      const prs = JSON.parse(openPRs);
      const agentPRs = prs.filter((pr) =>
        pr.labels.some((label) => label.name.startsWith('lane:'))
      );

      return {
        total: prs.length,
        agentCreated: agentPRs.length,
        manual: prs.length - agentPRs.length,
      };
    } catch (error) {
      console.error('Error collecting PR metrics:', error.message);
      return { total: 0, agentCreated: 0, manual: 0 };
    }
  }

  async getCostMetrics() {
    try {
      const costFile = path.join(process.cwd(), 'agent-status', 'cost-tracking.json');
      const content = await fs.readFile(costFile, 'utf8');
      const costData = JSON.parse(content);

      const config = JSON.parse(await fs.readFile('config.json', 'utf8'));
      const budget = config.cost.budgetPerMonth;
      const percent = (costData.totalCost / budget) * 100;

      return {
        total: costData.totalCost,
        budget,
        percent: percent.toFixed(1),
        byLane: costData.byLane || {},
      };
    } catch (error) {
      return { total: 0, budget: 500, percent: 0, byLane: {} };
    }
  }

  async saveMetrics(metrics) {
    await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
  }

  async printReport() {
    const metrics = await this.collectMetrics();

    console.log('\n📊 Multi-Agent Swarm Metrics');
    console.log('═══════════════════════════════════════');
    console.log(`Time: ${metrics.timestamp}`);
    console.log('\n🤖 Agents:');
    console.log(`  Active: ${metrics.agents.active}`);
    console.log(`  Idle: ${metrics.agents.idle}`);
    console.log(`  Blocked: ${metrics.agents.blocked}`);
    console.log(`  Total: ${metrics.agents.total}`);

    console.log('\n📝 Pull Requests:');
    console.log(`  Open: ${metrics.prs.total}`);
    console.log(`  Agent-created: ${metrics.prs.agentCreated}`);
    console.log(`  Manual: ${metrics.prs.manual}`);

    console.log('\n💰 Costs:');
    console.log(`  Spent: $${metrics.costs.total.toFixed(2)}`);
    console.log(`  Budget: $${metrics.costs.budget}`);
    console.log(`  Used: ${metrics.costs.percent}%`);

    if (Object.keys(metrics.costs.byLane).length > 0) {
      console.log('\n  By Lane:');
      for (const [lane, data] of Object.entries(metrics.costs.byLane)) {
        console.log(`    ${lane}: $${data.cost.toFixed(2)}`);
      }
    }
  }
}

// CLI usage
async function main() {
  const collector = new MetricsCollector();
  await collector.printReport();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MetricsCollector;
