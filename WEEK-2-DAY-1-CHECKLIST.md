# Week 2 Day 1: Semi-Automated Mode Activation Checklist

**Date:** Ready to Start
**Mode:** Manual → Semi-Automated Transition
**Status:** ✅ Week 1 Complete, Ready for Week 2

---

## 📋 Overview

This checklist guides you through activating Week 2 semi-automated mode where AI assists with implementation while you maintain oversight and review all code before committing.

**Time Required:** ~2-3 hours for setup + first ticket
**Expected Outcome:** PAT configured, coordinator enabled, first AI-assisted ticket completed

---

## ✅ Pre-Flight Check

Before starting, verify Week 1 completion:

- [x] Week 1 manual mode complete
- [x] All 5 lanes validated
- [x] 8 PRs merged successfully
- [x] Documentation complete
- [x] System status: Operational

**If any item is unchecked, review `WEEK-1-COMPLETE.md` first.**

---

## 🔧 Part 1: Personal Access Token Setup (15 min)

### Why This Is Needed

The coordinator workflow needs to poll the GitHub Project board for new tickets. The default `GITHUB_TOKEN` cannot access user-owned projects, so we need a Personal Access Token (PAT) with project scope.

### Steps

**1.1 Generate Fine-Grained Personal Access Token**

1. Go to: https://github.com/settings/tokens?type=beta
2. Click "Generate new token" (fine-grained)
3. Fill in the form:

| Field | Value |
|-------|-------|
| **Token name** | `saas202520-coordinator` |
| **Expiration** | 90 days (or custom) |
| **Description** | Coordinator access for Multi-AI Swarm |
| **Resource owner** | ChrisStephens1971 |
| **Repository access** | Only select repositories |
| **Selected repository** | ChrisStephens1971/saas202520 |

4. Set **Repository permissions:**

| Permission | Access |
|------------|--------|
| Contents | Read and write |
| Issues | Read and write |
| Metadata | Read-only (automatic) |
| Pull requests | Read and write |
| Workflows | Read and write |

5. Set **Account permissions:**

| Permission | Access |
|------------|--------|
| **Projects** | **Read and write** ⚠️ IMPORTANT |

6. Click "Generate token"
7. **COPY THE TOKEN** - You won't see it again!

**1.2 Add Token as Repository Secret**

1. Go to: https://github.com/ChrisStephens1971/saas202520/settings/secrets/actions
2. Click "New repository secret"
3. Fill in:
   - **Name:** `COORDINATOR_PAT`
   - **Secret:** (paste the token you copied)
4. Click "Add secret"

**1.3 Verify Secret Added**

- [ ] Navigate to: https://github.com/ChrisStephens1971/saas202520/settings/secrets/actions
- [ ] Confirm `COORDINATOR_PAT` appears in the list
- [ ] Note: You cannot view the value (security feature)

**✅ Checkpoint:** PAT created and added as repository secret

---

## 🤖 Part 2: Test Coordinator with PAT (10 min)

Before enabling automatic polling, test that the coordinator can access the project board.

**2.1 Update Coordinator Workflow (Temporary Test)**

You can test manually without changing the workflow file:

```bash
# Trigger coordinator manually
cd C:/devop/saas202520
gh workflow run coordinator.yml
```

**2.2 Monitor Coordinator Run**

```bash
# Wait a few seconds, then check status
gh run list --workflow=coordinator.yml --limit 1

# Get the run ID from the output, then view logs
gh run view <RUN_ID> --log
```

**2.3 Verify Success**

Look for these in the logs:
- ✅ "Polling project board..."
- ✅ "Found X tickets in 'Todo' column"
- ✅ No authentication errors
- ✅ Successfully accessed project board

**If you see errors:**
- Check PAT has `project` permission (account-level)
- Verify PAT is added as `COORDINATOR_PAT` secret
- Check token hasn't expired
- Ensure project URL is correct in `config.json`

**✅ Checkpoint:** Coordinator successfully polls project board

---

## ⏰ Part 3: Enable Coordinator Polling Schedule (5 min)

**IMPORTANT:** Only enable after successful manual test above!

**3.1 Update Coordinator Workflow**

Edit `.github/workflows/coordinator.yml`:

```yaml
name: Coordinator

on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch: # Keep manual trigger for testing

# ... rest of file unchanged
```

**3.2 Commit and Push**

```bash
cd C:/devop/saas202520
git add .github/workflows/coordinator.yml
git commit -m "feat(coordinator): enable polling schedule (every 30 min)

Enables semi-automated mode for Week 2.

Changes:
- Add schedule trigger (every 30 minutes)
- Keep workflow_dispatch for manual triggers
- Uses COORDINATOR_PAT for project board access

Week 2 Semi-Automated Mode:
- Coordinator polls board every 30 min
- Detects new tickets in Todo column
- Manual implementation with AI assistance
- Auto-merge for eligible PRs

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin master
```

**3.3 Verify Schedule Enabled**

- [ ] Go to: https://github.com/ChrisStephens1971/saas202520/actions/workflows/coordinator.yml
- [ ] Check that "schedule" appears in the "On" section
- [ ] Coordinator will run every 30 minutes starting from next half-hour

**✅ Checkpoint:** Coordinator polling enabled

---

## 📝 Part 4: Review Week 2 Ticket Backlog (10 min)

**4.1 Check Created Tickets**

I've already created 4 high-priority tickets for Sprint 1 foundation:

```bash
# View all open issues
gh issue list --label "priority:high"
```

**Expected Issues:**
- [x] #15: Add organization CRUD endpoints (backend)
- [x] #16: Define organization API contracts (contracts)
- [x] #17: Add organization selector component (frontend)
- [x] #18: Enhance middleware with tenant context (backend)

**4.2 Verify Tickets on Project Board**

- [ ] Go to: https://github.com/users/ChrisStephens1971/projects/1
- [ ] Confirm 4 new tickets appear in "Todo" column
- [ ] Verify proper lane labels applied

**4.3 Review Dependencies**

Recommended order:
1. **#16 first** (Contracts) - Defines types for #15
2. **#15 second** (Backend) - Implements CRUD using contracts
3. **#18 third** (Backend) - Enhances middleware for #15
4. **#17 fourth** (Frontend) - Uses #15 endpoints

**✅ Checkpoint:** Ticket backlog reviewed and prioritized

---

## 🚀 Part 5: Start First AI-Assisted Ticket (60-90 min)

Let's implement the first Week 2 ticket with AI assistance!

**Recommended First Ticket:** #16 (Organization API Contracts)
**Why:** Foundation for #15, similar to tournament contracts (PR #10)

**5.1 Create Feature Branch**

```bash
cd C:/devop/saas202520
git checkout master
git pull origin master
git checkout -b feat/contracts/16-organization-api-contracts
```

**5.2 Use AI for Implementation**

**Prompt for Claude Code:**
```
I need to implement organization API contracts for Issue #16.

Context:
- Lane: Contracts
- Issue: #16 (organization API contracts)
- Similar to: packages/api-contracts/src/tournaments.ts (PR #10)

Requirements:
- Organization entity with id, name, slug, timestamps
- OrganizationMember entity with orgId, userId, role
- CRUD request/response schemas
- Zod validation
- Role enum: owner, td, scorekeeper, streamer

Multi-tenant:
- Organization IS the tenant (no org_id in Organization table)
- Members link users to organizations
- Slug must be unique and URL-safe

Please:
1. Review existing tournament contracts for patterns
2. Create packages/api-contracts/src/organizations.ts
3. Include comprehensive Zod schemas
4. Add unit tests
5. Export from packages/api-contracts/src/index.ts

Follow the same structure and quality as tournament contracts.
```

**5.3 Review AI-Generated Code**

**Security Checklist:**
- [ ] No SQL injection vulnerabilities
- [ ] Proper input validation with Zod
- [ ] Slug validation (URL-safe)
- [ ] Role enum properly constrained
- [ ] No secrets or credentials

**Code Quality Checklist:**
- [ ] Follows tournament contracts pattern
- [ ] TypeScript types correct
- [ ] Comments explain complex logic
- [ ] Proper exports

**Testing Checklist:**
- [ ] Unit tests for all schemas
- [ ] Tests validate required fields
- [ ] Tests check enum constraints
- [ ] Tests verify slug format

**5.4 Test Locally**

```bash
# Install dependencies if needed
pnpm install

# Run tests
pnpm --filter=@tournament/api-contracts test

# Check for TypeScript errors
pnpm exec tsc --noEmit
```

**5.5 Commit and Push**

```bash
git add packages/api-contracts/
git commit -m "feat(contracts): add organization API contracts

Implements TypeScript interfaces and Zod schemas for organization management.

Features:
- Organization entity (id, name, slug)
- OrganizationMember entity (orgId, userId, role)
- CRUD request/response schemas
- Role validation (owner, td, scorekeeper, streamer)
- Slug format validation (URL-safe)
- Comprehensive unit tests

Testing:
- Schema validation tests
- Enum constraint tests
- Required field validation
- Slug format validation

Closes #16

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push -u origin feat/contracts/16-organization-api-contracts
```

**5.6 Create Pull Request**

```bash
gh pr create \
  --title "feat(contracts): add organization API contracts" \
  --body "$(cat <<'PRBODY'
## Summary

Implements TypeScript interfaces and Zod schemas for organization management API endpoints.

## Changes

✅ **Organization Entity Schema:**
- Complete organization data structure
- Fields: id, name, slug, timestamps
- Organization is the tenant (no org_id self-reference)

✅ **OrganizationMember Entity Schema:**
- Links users to organizations
- Fields: id, orgId, userId, role, createdAt
- Role enum: owner, td, scorekeeper, streamer

✅ **Request/Response Schemas:**
- CreateOrganization - POST /api/organizations
- UpdateOrganization - PUT /api/organizations/:id
- ListOrganizations - GET /api/organizations
- GetOrganization - GET /api/organizations/:id
- DeleteOrganization - DELETE /api/organizations/:id

✅ **Validation:**
- Zod schemas for runtime type checking
- Slug format validation (lowercase, alphanumeric, hyphens)
- Role enum constraints
- Required field validation

✅ **Testing:**
- Comprehensive test suite
- Schema validation tests
- Enum constraint tests
- Slug format validation

## Files Changed

- `packages/api-contracts/src/organizations.ts` - Contract definitions
- `packages/api-contracts/src/organizations.test.ts` - Test suite
- `packages/api-contracts/src/index.ts` - Export organizations

## Testing Checklist

- [x] All schemas validate correct data
- [x] Invalid data rejected properly
- [x] Role enum constraints validated
- [x] Slug format validated
- [x] Required fields enforced
- [x] Tests pass

## Lane

Contracts

## Related Issue

Closes #16

🤖 Generated with Claude Code
PRBODY
)" \
  --label "lane:contracts,priority:high"
```

**5.7 Monitor Auto-Merge**

```bash
# Wait 30 seconds for CI to start
sleep 30

# Check PR status
gh pr checks <PR_NUMBER>

# If all checks pass and PR is small enough:
# - Reviewer will auto-merge
# - Issue #16 will auto-close
# - You're done!
```

**✅ Checkpoint:** First AI-assisted ticket complete!

---

## 📊 Part 6: Week 2 Day 1 Wrap-Up (15 min)

**6.1 Review What We Accomplished**

- [ ] PAT created and configured
- [ ] Coordinator polling enabled (every 30 min)
- [ ] 4 tickets created for Sprint 1 foundation
- [ ] First AI-assisted ticket completed
- [ ] Auto-merge validated for Week 2

**6.2 Check System Status**

```bash
# Recent workflow runs
gh run list --limit 5

# Open issues
gh issue list --label "priority:high"

# Recent PRs
gh pr list --limit 5
```

**6.3 Plan Tomorrow (Day 2)**

**Recommended tickets for Day 2:**
- Issue #15: Organization CRUD endpoints (uses #16 contracts)
- Issue #18: Enhanced tenant context middleware

**Target:** 2-3 tickets on Day 2

**6.4 Cost Check**

If you processed ticket #16 with AI assistance:
- Estimated cost: $2-5 (for AI code generation)
- Still well within budget

Track weekly: Should stay under $50/week

**✅ Day 1 Complete!**

---

## 🎯 Success Criteria

Day 1 is successful if:

- ✅ PAT created and working
- ✅ Coordinator polling enabled
- ✅ At least 1 ticket completed with AI assistance
- ✅ Auto-merge still working (>90% rate)
- ✅ No security incidents
- ✅ Code quality maintained

---

## ⚠️ Troubleshooting

### Coordinator Can't Access Project Board

**Symptom:** "GraphQL: Could not resolve to a ProjectV2" error

**Solutions:**
1. Verify PAT has account-level `project` permission (not just repository)
2. Check PAT is added as `COORDINATOR_PAT` secret (exact name)
3. Ensure project URL in `config.json` uses `/users/` not `/repos/`
4. Verify PAT hasn't expired

### Auto-Merge Not Working

**Symptom:** PR eligible but not merging

**Solutions:**
1. Check PR size: <10 files, <800 lines
2. Verify no breaking-change or security-alert labels
3. Check CI status (may need to wait for completion)
4. Review reviewer workflow logs

### AI Code Quality Issues

**Symptom:** AI-generated code needs heavy rework

**Solutions:**
1. Improve prompt with more context and examples
2. Reference existing similar code (like tournament contracts)
3. Break ticket into smaller pieces
4. Review and refine incrementally

### Tests Failing

**Symptom:** CI test failures

**Solutions:**
1. Run tests locally first: `pnpm test`
2. Check for missing dependencies
3. Verify test file naming: `*.test.ts` or `*.spec.ts`
4. Review test output for specific errors

---

## 📚 Resources

**Documentation:**
- `WEEK-2-PREPARATION.md` - Full Week 2 guide
- `WEEK-1-COMPLETE.md` - Week 1 results and patterns
- `apps/web/app/api/TESTING-STRATEGY.md` - Testing guide
- `CLAUDE.md` - Multi-tenant architecture patterns

**Examples:**
- PR #10: Tournament API contracts (contracts lane)
- PR #8: Landing page hero (frontend lane)
- PR #3: Middleware enhancement (backend lane)

**Tools:**
- GitHub CLI: `gh` commands
- Claude Code: AI implementation assistance
- Prisma: Database ORM and migrations

---

## 🎉 Congratulations!

If you've completed this checklist, you've successfully:

✅ Activated Week 2 semi-automated mode
✅ Enabled coordinator polling
✅ Completed your first AI-assisted ticket
✅ Maintained auto-merge success rate
✅ Set foundation for 2-3x velocity improvement

**Week 2 is officially underway!** 🚀

---

**Next Steps:**
- Day 2: Process tickets #15 and #18 with AI assistance
- Day 3: Add frontend component (#17)
- Days 4-7: Ramp up to 2-3 tickets/day

**Target by End of Week 2:** 10-15 tickets completed

---

*Created by: Claude Code (AI Assistant)*
*Date: 2025-11-04*
*Status: Ready for Week 2 Day 1*
