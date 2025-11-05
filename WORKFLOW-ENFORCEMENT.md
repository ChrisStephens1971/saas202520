# ⚠️ WORKFLOW ENFORCEMENT - READ BEFORE ANY CODING

## 🛑 STOP! Are you about to write code directly?

**If the user asks to implement/build/complete something, you MUST follow this workflow:**

---

## ✅ CORRECT WORKFLOW (3 Steps)

### Step 1: Identify Task Type & Choose Agent

| User Request | Use This Agent | Example |
|--------------|----------------|---------|
| "Complete Sprint X" | `general-purpose` | Coordinates sprint execution |
| "Build backend APIs" | `backend-development:backend-architect` | API design & implementation |
| "Add tests" | `full-stack-orchestration:test-automator` | Test generation |
| "Security review" | `full-stack-orchestration:security-auditor` | Security audit |
| "Deploy features" | `cloud-infrastructure:deployment-engineer` | CI/CD setup |
| "Performance optimize" | `full-stack-orchestration:performance-engineer` | Performance tuning |

### Step 2: Launch Agents in PARALLEL (Not Sequential)

**❌ WRONG:**
```
1. Code API endpoint 1
2. Code API endpoint 2
3. Code API endpoint 3
(Sequential - SLOW)
```

**✅ RIGHT:**
```typescript
// Launch ALL agents in ONE message
<function_calls>
  <invoke name="Task">
    <parameter name="subagent_type">backend-development:backend-architect</parameter>
    <parameter name="description">Build scoring APIs</parameter>
    <parameter name="prompt">Implement all scoring endpoints...</parameter>
  </invoke>
  <invoke name="Task">
    <parameter name="subagent_type">backend-development:backend-architect</parameter>
    <parameter name="description">Build payment APIs</parameter>
    <parameter name="prompt">Implement all payment endpoints...</parameter>
  </invoke>
  <invoke name="Task">
    <parameter name="subagent_type">full-stack-orchestration:test-automator</parameter>
    <parameter name="description">Generate tests</parameter>
    <parameter name="prompt">Create comprehensive tests...</parameter>
  </invoke>
</function_calls>
```

### Step 3: Coordinate Results

- Each agent returns their work independently
- You collect and summarize all results
- Report back to user with comprehensive summary

---

## 🚫 When You CAN Code Directly (Exceptions)

You may ONLY code directly for:
- ✅ Simple config changes (< 5 lines)
- ✅ Documentation edits
- ✅ File reads/searches
- ✅ Quick bug fixes

**Everything else = Use agents!**

---

## 📋 Quick Reference: Available Agents

**Backend Development:**
- `backend-development:backend-architect` - API design, microservices
- `backend-development:graphql-architect` - GraphQL APIs
- `python-development:django-pro` - Django apps
- `python-development:fastapi-pro` - FastAPI apps

**Testing:**
- `full-stack-orchestration:test-automator` - Test generation
- `unit-testing:test-automator` - Unit tests
- `unit-testing:debugger` - Debug issues

**Security & Performance:**
- `full-stack-orchestration:security-auditor` - Security audits
- `full-stack-orchestration:performance-engineer` - Performance optimization

**DevOps:**
- `cloud-infrastructure:deployment-engineer` - CI/CD pipelines
- `cloud-infrastructure:cloud-architect` - Cloud infrastructure
- `cloud-infrastructure:kubernetes-architect` - K8s deployments

**General:**
- `general-purpose` - Complex multi-step tasks
- `Explore` - Codebase exploration
- `Plan` - Planning and analysis

---

## 🔥 CRITICAL RULE

**IF USER SAYS "implement" or "build" or "complete sprint":**
1. Read this file FIRST
2. Use parallel agents
3. DO NOT code everything yourself

**NO EXCEPTIONS TO THIS RULE!**
