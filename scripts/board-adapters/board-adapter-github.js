#!/usr/bin/env node
/**
 * GitHub Projects Board Adapter for Multi-Agent Swarm
 * v2.1.2 - Polls GitHub Projects and creates agent work
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class GitHubBoardAdapter {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.statusDir = path.join(process.cwd(), 'agent-status');
    this.config = null;
  }

  async initialize() {
    // Load config
    const configContent = await fs.readFile(this.configPath, 'utf8');
    this.config = JSON.parse(configContent);

    // Ensure status directory exists
    await fs.mkdir(this.statusDir, { recursive: true });
  }

  async getReadyTickets() {
    console.log('📋 Fetching tickets from GitHub Projects...\n');

    try {
      // Get repository info from config
      const repoUrl = this.config.project.repository;
      const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');

      // Get project board items using GitHub CLI
      // First, get project ID from URL
      const projectUrl = this.config.project.board.url;
      const projectNumber = projectUrl.match(/projects\/(\d+)/)?.[1];

      if (!projectNumber) {
        throw new Error(`Invalid project URL: ${projectUrl}`);
      }

      // Get project items
      // v2.1.2: Use @me for user projects (detected by /users/ in URL)
      const projectOwner = projectUrl.includes('/users/') ? '@me' : owner;
      const command = `gh project item-list ${projectNumber} --owner ${projectOwner} --format json`;
      const result = execSync(command, { encoding: 'utf8' });
      const items = JSON.parse(result);

      // Filter for items in "Ready" column
      const readyItems = items.items.filter((item) => {
        // Check if item is in Ready/TODO column
        const status = item.status || item.column || '';
        return (
          status.toLowerCase().includes('ready') ||
          status.toLowerCase().includes('todo') ||
          status === this.config.project.board.readyColumnId
        );
      });

      console.log(`Found ${readyItems.length} ticket(s) in Ready column\n`);

      // Transform to our ticket format
      const tickets = [];
      for (const item of readyItems) {
        const ticket = await this.transformTicket(item, owner, repo);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets;
    } catch (error) {
      console.error(`❌ Error fetching tickets: ${error.message}`);
      return [];
    }
  }

  async transformTicket(item, owner, repo) {
    try {
      // Get issue details if this is an issue
      let issueData = null;
      if (item.content?.type === 'Issue' || item.content?.number) {
        const issueNumber = item.content.number;
        const command = `gh issue view ${issueNumber} --repo ${owner}/${repo} --json title,body,labels,assignees,milestone`;
        const result = execSync(command, { encoding: 'utf8' });
        issueData = JSON.parse(result);
      }

      const ticket = {
        id: item.id || `item-${Date.now()}`,
        number: item.content?.number || null,
        title: issueData?.title || item.title || 'Untitled',
        description: issueData?.body || item.content?.body || '',
        labels: issueData?.labels?.map((l) => l.name) || [],
        lane: this.determineLane(issueData?.labels || []),
        priority: this.determinePriority(issueData?.labels || []),
        estimate: this.extractEstimate(issueData?.body || ''),
        acceptanceCriteria: this.extractAcceptanceCriteria(issueData?.body || ''),
        assignees: issueData?.assignees?.map((a) => a.login) || [],
        status: 'ready',
        createdAt: item.createdAt || new Date().toISOString(),
      };

      return ticket;
    } catch (error) {
      console.error(`⚠️ Could not transform ticket: ${error.message}`);
      return null;
    }
  }

  determineLane(labels) {
    // Check for explicit lane labels
    for (const label of labels) {
      if (label.name.startsWith('lane:')) {
        return label.name.replace('lane:', '');
      }
    }

    // Auto-determine based on other labels
    const labelNames = labels.map((l) => l.name.toLowerCase());

    if (labelNames.includes('api') || labelNames.includes('contract')) {
      return 'contracts';
    }
    if (labelNames.includes('backend') || labelNames.includes('server')) {
      return 'backend';
    }
    if (labelNames.includes('frontend') || labelNames.includes('ui')) {
      return 'frontend';
    }
    if (labelNames.includes('test') || labelNames.includes('testing')) {
      return 'tests';
    }
    if (labelNames.includes('database') || labelNames.includes('migration')) {
      return 'migrations';
    }

    // Default to backend if unclear
    return 'backend';
  }

  determinePriority(labels) {
    const labelNames = labels.map((l) => l.name.toLowerCase());

    if (labelNames.includes('p0') || labelNames.includes('critical')) {
      return 'critical';
    }
    if (labelNames.includes('p1') || labelNames.includes('high')) {
      return 'high';
    }
    if (labelNames.includes('p2') || labelNames.includes('medium')) {
      return 'medium';
    }
    if (labelNames.includes('p3') || labelNames.includes('low')) {
      return 'low';
    }

    return 'medium';
  }

  extractEstimate(body) {
    // Look for story points or estimates in body
    const estimateMatch = body.match(/estimate[:\s]+(\d+)\s*(points?|sp)?/i);
    if (estimateMatch) {
      return parseInt(estimateMatch[1]);
    }

    const pointsMatch = body.match(/(\d+)\s*story\s*points?/i);
    if (pointsMatch) {
      return parseInt(pointsMatch[1]);
    }

    return 3; // Default estimate
  }

  extractAcceptanceCriteria(body) {
    const criteria = [];

    // Look for acceptance criteria section
    const acMatch = body.match(/acceptance\s+criteria[:\s]*\n([\s\S]*?)(?:\n#{2,}|\n\n|$)/i);
    if (acMatch) {
      const lines = acMatch[1].split('\n');
      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned.startsWith('- [ ]') || cleaned.startsWith('- [x]')) {
          criteria.push(cleaned.substring(5).trim());
        } else if (cleaned.startsWith('-')) {
          criteria.push(cleaned.substring(1).trim());
        } else if (cleaned.length > 0) {
          criteria.push(cleaned);
        }
      }
    }

    return criteria;
  }

  async createAgentWork(ticket) {
    console.log(`🤖 Creating work for: ${ticket.title} (${ticket.lane})`);

    // Check lane capacity
    const laneConfig = this.config.lanes[ticket.lane];
    if (!laneConfig || !laneConfig.enabled) {
      console.log(`   ⚠️ Lane ${ticket.lane} is not enabled`);
      return null;
    }

    // Count active agents in lane
    const activeCount = await this.countActiveAgentsInLane(ticket.lane);
    if (activeCount >= laneConfig.maxConcurrent) {
      console.log(
        `   ⚠️ Lane ${ticket.lane} is at capacity (${activeCount}/${laneConfig.maxConcurrent})`
      );
      return null;
    }

    // Create agent status file
    const agentId = `${ticket.lane}-${ticket.number || Date.now()}`;
    const agentStatus = {
      agentId,
      type: 'worker',
      lane: ticket.lane,
      status: 'assigned',
      task: ticket.title,
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      branch: `feat/${ticket.lane}/${ticket.number}-${this.slugify(ticket.title)}`,
      model: laneConfig.model || 'haiku',
      priority: ticket.priority,
      estimate: ticket.estimate,
      acceptanceCriteria: ticket.acceptanceCriteria,
      assignedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    };

    // Save agent status
    const statusPath = path.join(this.statusDir, `${agentId}.json`);
    await fs.writeFile(statusPath, JSON.stringify(agentStatus, null, 2));

    console.log(`   ✅ Created agent: ${agentId}`);
    console.log(`   📌 Branch: ${agentStatus.branch}`);

    // Create branch and initial commit
    await this.createBranch(agentStatus);

    // Update ticket status (move to In Progress)
    await this.updateTicketStatus(ticket, 'in_progress');

    return agentStatus;
  }

  async countActiveAgentsInLane(lane) {
    try {
      const files = await fs.readdir(this.statusDir);
      let count = 0;

      for (const file of files) {
        if (file.startsWith(`${lane}-`) && file.endsWith('.json')) {
          const filePath = path.join(this.statusDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const agent = JSON.parse(content);

          if (['assigned', 'in_progress', 'waiting'].includes(agent.status)) {
            count++;
          }
        }
      }

      return count;
    } catch (error) {
      console.error(`Error counting agents: ${error.message}`);
      return 0;
    }
  }

  async createBranch(agentStatus) {
    try {
      // Create and checkout new branch
      execSync(`git checkout -b ${agentStatus.branch}`, { encoding: 'utf8' });

      // Create initial commit with ticket info
      const commitMessage = `feat(${agentStatus.lane}): Start work on ${agentStatus.task}

Ticket: #${agentStatus.ticketNumber || 'N/A'}
Agent: ${agentStatus.agentId}
Assigned: ${agentStatus.assignedAt}`;

      // Create a marker file for the agent
      const markerPath = path.join('.agent-work', `${agentStatus.agentId}.md`);
      await fs.mkdir(path.dirname(markerPath), { recursive: true });
      await fs.writeFile(markerPath, `# ${agentStatus.task}\n\nAgent work in progress...`);

      execSync(`git add ${markerPath}`, { encoding: 'utf8' });
      execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });

      console.log(`   ✅ Created branch: ${agentStatus.branch}`);

      // Return to main branch
      execSync(`git checkout main`, { encoding: 'utf8' });
    } catch (error) {
      console.error(`   ❌ Error creating branch: ${error.message}`);
    }
  }

  async updateTicketStatus(ticket, status) {
    try {
      if (!ticket.number) return;

      const repoUrl = this.config.project.repository;
      const [owner, repo] = repoUrl.replace('https://github.com/', '').split('/');

      // Add in-progress label
      execSync(`gh issue edit ${ticket.number} --repo ${owner}/${repo} --add-label "in-progress"`, {
        encoding: 'utf8',
      });

      console.log(`   ✅ Updated ticket #${ticket.number} status`);
    } catch (error) {
      console.error(`   ⚠️ Could not update ticket status: ${error.message}`);
    }
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 30);
  }

  async pollBoard() {
    console.log('🔄 Starting board poll...\n');
    console.log(`Mode: ${this.config.agents.coordinator.mode}`);
    console.log(`Time: ${new Date().toISOString()}\n`);

    // Get ready tickets
    const tickets = await this.getReadyTickets();

    if (tickets.length === 0) {
      console.log('No tickets ready for work\n');
      return;
    }

    // Process each ticket
    const created = [];
    for (const ticket of tickets) {
      // Check if ticket already has an agent
      const existingAgent = await this.findExistingAgent(ticket);
      if (existingAgent) {
        console.log(`⏩ Ticket already assigned: ${ticket.title}`);
        continue;
      }

      // Create agent work
      const agent = await this.createAgentWork(ticket);
      if (agent) {
        created.push(agent);
      }
    }

    // Update status board
    if (created.length > 0) {
      console.log(`\n✅ Created ${created.length} agent(s)`);

      // Run status aggregation
      try {
        execSync('python scripts/aggregate-status.py', { encoding: 'utf8' });
        console.log('📊 Status board updated');
      } catch (error) {
        console.error('❌ Failed to update status board:', error.message);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`Next poll in ${this.config.agents.coordinator.pollIntervalMinutes} minutes`);
  }

  async findExistingAgent(ticket) {
    try {
      const files = await fs.readdir(this.statusDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.statusDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const agent = JSON.parse(content);

          if (agent.ticketNumber === ticket.number || agent.ticketId === ticket.id) {
            return agent;
          }
        }
      }
    } catch (error) {
      console.error(`Error checking existing agents: ${error.message}`);
    }

    return null;
  }
}

// CLI usage
async function main() {
  const adapter = new GitHubBoardAdapter();
  await adapter.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'poll':
      // One-time poll
      await adapter.pollBoard();
      break;

    case 'list':
      // List ready tickets
      const tickets = await adapter.getReadyTickets();
      console.log(`\n📋 Ready Tickets:\n`);
      for (const ticket of tickets) {
        console.log(`  #${ticket.number || 'N/A'} - ${ticket.title}`);
        console.log(
          `    Lane: ${ticket.lane} | Priority: ${ticket.priority} | Estimate: ${ticket.estimate}`
        );
      }
      break;

    case 'monitor':
      // Continuous monitoring
      await adapter.pollBoard();

      // Set up interval
      const intervalMs = adapter.config.agents.coordinator.pollIntervalMinutes * 60 * 1000;
      setInterval(() => adapter.pollBoard(), intervalMs);

      console.log('\n🔄 Continuous monitoring started');
      break;

    default:
      console.log('Usage:');
      console.log('  node board-adapter-github.js poll     # One-time poll');
      console.log('  node board-adapter-github.js list     # List ready tickets');
      console.log('  node board-adapter-github.js monitor  # Continuous monitoring');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = GitHubBoardAdapter;
