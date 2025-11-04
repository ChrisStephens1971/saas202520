# Agent Onboarding Guide

## For Developers New to the Swarm

### What is This?

The multi-agent swarm is an automated system where AI agents handle different types of work in parallel:

- **Contract Worker**: API design and validation
- **Backend Worker**: Server implementation
- **Frontend Worker**: UI development
- **Test Worker**: Test coverage
- **Reviewer**: Code review and merging

### How Does It Work?

1. You create a ticket in GitHub Projects
2. Move it to "Ready" column
3. Coordinator assigns it to the right agent lane
4. Agent creates a PR with implementation
5. Automated tests run
6. If safe, PR auto-merges
7. If risky, human reviews first

### Your First Week

**Day 1: Observe**
- Watch the status board: `AGENT-STATUS.md`
- See how tickets move through the system
- Review a few agent-created PRs

**Day 2: Create a Simple Ticket**
- Start with a small, low-risk feature
- Example: "Add loading spinner to tournaments page"
- Label it `lane:frontend`
- Watch the agent handle it

**Day 3: Create a Backend Ticket**
- Try a simple API endpoint
- Example: "Add GET /api/health endpoint"
- Label it `lane:backend`
- Review the implementation

**Day 4: Test the Limits**
- Try a feature that spans lanes
- Example: "Add tournament filtering"
- Needs both backend (API) and frontend (UI)
- See how Request Queue coordinates

**Day 5: Handle a Review**
- Wait for a PR that needs human review
- These are security-sensitive or breaking changes
- Practice reviewing agent-generated code

### Writing Good Tickets

Agents work best with clear, specific tickets:

**Good Ticket:**
```markdown
## Title
Add email validation to player registration

## Description
When registering a player, validate email format before saving.

## Acceptance Criteria
- [ ] Email field validates format (name@domain.com)
- [ ] Shows error message for invalid emails
- [ ] Saves only when email is valid
- [ ] Includes unit test for validation

## Labels
lane:backend, priority:medium
```

**Bad Ticket:**
```markdown
## Title
Fix players

## Description
Players aren't working right

## Labels
bug
```

### Understanding Lane Labels

- `lane:contracts` - API design, OpenAPI changes
- `lane:backend` - Server code, database, business logic
- `lane:frontend` - UI, React components, styling
- `lane:tests` - Test coverage, E2E scenarios
- `lane:migrations` - Database schema changes (requires human approval)

### When Agents Need Help

Agents will create issues with `request-queue` label when they're blocked:

**Example:**
> "Backend agent needs new API endpoint defined before implementing user preferences feature"

Your job:
1. Review the request
2. Assign to the right lane
3. Prioritize appropriately

### Safety Mechanisms

**Automatic Human Review Triggers:**
- Changes to auth code
- Database migrations
- Breaking API changes
- Security-sensitive paths
- Large PRs (>10 files)

**You'll be notified when:**
- Your review is needed
- Budget threshold reached
- Deadlocks detected
- Agent work fails

### Common Questions

**Q: Can I edit an agent's PR?**
A: Yes! Push commits to the same branch. The agent will incorporate your changes.

**Q: What if the agent makes a mistake?**
A: Close the PR and create a new ticket with clarification. Or fix it manually.

**Q: Can agents work on my manual PR?**
A: No. Agents only work on tickets assigned by the coordinator.

**Q: How do I pause an agent?**
A: Add `on-hold` label to the PR or pause via status file.

**Q: What if I need something urgent?**
A: Use `priority:critical` label. Agent will pick it up first.

### Pro Tips

1. **Be specific** - Vague tickets = slow progress
2. **Use examples** - Show what you want
3. **Set priority** - Critical/High/Medium/Low
4. **Review quickly** - Don't let PRs sit
5. **Trust but verify** - Agents are good, but check their work
6. **Give feedback** - Help improve the system

### Monitoring Your Tickets

Check status:
```bash
# View all agent activity
cat AGENT-STATUS.md

# Check specific ticket
gh issue view 123 --comments
```

### Getting Help

- **Stuck ticket**: Check SWARM-RUNBOOK.md troubleshooting
- **Agent issue**: Create issue with `swarm-support` label
- **Emergency**: Ping @tech-lead in Slack

### Next Steps

After your first week:
1. Read MULTI-TENANT-SWARM-GUIDE.md
2. Review a few agent PRs for quality
3. Start creating more complex tickets
4. Help other team members onboard

---

*Welcome to the swarm! 🤖*