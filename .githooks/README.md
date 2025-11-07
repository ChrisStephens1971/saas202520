# Git Hooks - Automated Documentation

This directory contains git hooks for automated documentation generation and validation.

---

## 🚀 Installation

Enable these hooks in your project:

```bash
# One-time setup
git config core.hooksPath .githooks
chmod +x .githooks/*  # Mac/Linux only
```

---

## 📋 Available Hooks

### pre-commit

**NEW: Now includes auto-fix capabilities!**

**Phase 1: Auto-Fix (runs automatically):**
- ✅ Removes trailing whitespace from staged files
- ✅ Normalizes line endings (CRLF → LF)
- ✅ Ensures files end with a newline
- ✅ Auto-formats code (black for Python, prettier for JS/JSON/MD)

**Phase 2: Validation (blocks commit if issues found):**
- ✅ No unreplaced placeholders (`{{...}}`)
- ✅ No `.env.local` files being committed
- ✅ Markdown syntax (if markdownlint installed)

**What you'll see:**
```bash
git commit -m "feat: add feature"
🔧 Running pre-commit auto-fix...
  ✓ Removed trailing whitespace from file.py
  ✓ Added final newline to README.md
  Auto-fixed 2 issue(s)
🔍 Running validation...
✅ Pre-commit validation passed
```

**When it fails:**
- Auto-fixes happen first (you don't need to do anything)
- If validation fails, fix the issues reported
- Re-stage your files and try commit again

### commit-msg

**Validates commit message format:**
- ✅ Must follow conventional commits: `<type>(<scope>): <description>`
- ✅ Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Examples:**
```bash
git commit -m "feat(auth): add OAuth login"
git commit -m "fix(api): resolve timeout error"
git commit -m "docs: update README"
```

### post-commit

**Optionally auto-generates documentation after each commit:**
- Session documentation (from recent changes)
- Changelog updates (from conventional commits)

**Enable auto-documentation:**

Create `.git/hooks-config`:
```bash
# Enable session doc auto-generation
AUTO_SESSION_DOC=true

# Enable changelog auto-generation
AUTO_CHANGELOG=true
```

### pre-push

**NEW: Checks branch status before pushing:**
- ✅ Detects if local branch has diverged from remote
- ✅ Warns about potential conflicts
- ✅ Suggests `git pull` if branches have diverged
- ✅ Allows user to continue or cancel push

**What you'll see:**
```bash
git push origin main
🔍 Checking branch status before push...
  ⚠️  WARNING: Your branch has diverged from origin/main

  Local commits not in remote:  3
  Remote commits not in local:  2

  You may need to:
    git pull --rebase    # Rebase your changes on top of remote
    git pull             # Merge remote changes

  Continue with push anyway? (y/N)
```

---

## 🔧 Configuration

### Auto-Fix Options

Configure in `.git/hooks-config`:

```bash
# ===== AUTO-FIX OPTIONS =====

# Automatically remove trailing whitespace (default: true)
AUTO_FIX_WHITESPACE=true

# Automatically normalize line endings CRLF → LF (default: true)
AUTO_FIX_LINE_ENDINGS=true

# Automatically ensure files end with newline (default: true)
AUTO_FIX_FINAL_NEWLINE=true

# Automatically format code with black/prettier (default: true)
AUTO_FORMAT_CODE=true

# Check for branch divergence before push (default: true)
CHECK_BRANCH_DIVERGENCE=true
```

**To disable a specific auto-fix:**
```bash
# Edit .git/hooks-config
AUTO_FIX_WHITESPACE=false  # Disable whitespace fixing
```

### Enable Auto-Documentation

```bash
# Add to .git/hooks-config
AUTO_SESSION_DOC=true
AUTO_CHANGELOG=true
AUTO_PROGRESS_SYNC=true
```

### Disable Specific Hooks

```bash
# Temporarily bypass hooks (emergency only, not recommended)
git commit --no-verify -m "emergency commit"

# Disable permanently
git config core.hooksPath ""  # Revert to default hooks
```

### Complete Configuration Example

Full `.git/hooks-config` with all options:

```bash
# Documentation automation
AUTO_SESSION_DOC=false
AUTO_CHANGELOG=false
AUTO_PROGRESS_SYNC=true

# Auto-fix options
AUTO_FIX_WHITESPACE=true
AUTO_FIX_LINE_ENDINGS=true
AUTO_FIX_FINAL_NEWLINE=true
AUTO_FORMAT_CODE=true

# Pre-push checks
CHECK_BRANCH_DIVERGENCE=true
```

---

## 📖 Manual Documentation Scripts

**You can also run documentation scripts manually:**

### Generate Session Documentation

```bash
# Auto-generate from last 24 hours of changes
python C:/devop/.template-system/scripts/generate_session_doc.py \
  --project-path $(pwd)

# Interactive mode (prompts for details)
python C:/devop/.template-system/scripts/generate_session_doc.py \
  --project-path $(pwd) \
  --interactive

# Custom time range
python C:/devop/.template-system/scripts/generate_session_doc.py \
  --project-path $(pwd) \
  --since-hours 8
```

### Generate Changelog

```bash
# Generate changelog for unreleased changes
python C:/devop/.template-system/scripts/generate_changelog.py \
  --project-path $(pwd) \
  --unreleased

# Generate changelog for specific version
python C:/devop/.template-system/scripts/generate_changelog.py \
  --project-path $(pwd) \
  --version v1.0.0
```

---

## 🎯 Workflow Integration

### Typical Daily Workflow

```bash
# 1. Make changes to code/docs
# ... edit files ...

# 2. Stage changes
git add .

# 3. Commit (hooks run automatically)
git commit -m "feat(feature): add new functionality"
#   ✅ pre-commit: validates no placeholders, no secrets
#   ✅ commit-msg: validates conventional commit format
#   ✅ post-commit: generates session doc (if enabled)

# 4. Push to remote
git push origin master
```

### End of Sprint Workflow

```bash
# 1. Generate final session doc for sprint
python C:/devop/.template-system/scripts/generate_session_doc.py \
  --project-path $(pwd) \
  --interactive

# 2. Generate changelog for release
python C:/devop/.template-system/scripts/generate_changelog.py \
  --project-path $(pwd) \
  --version v1.0.0

# 3. Review generated docs
# 4. Commit and tag release
git add CHANGELOG.md docs/progress/
git commit -m "docs: update changelog and session docs for v1.0.0"
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin master --tags
```

---

## 📝 Documentation Templates

These hooks work with the following documentation templates:

| Template | Location | Generated By |
|----------|----------|--------------|
| Session Progress | `docs/progress/SESSION-YYYY-MM-DD.md` | `generate_session_doc.py` |
| Changelog | `CHANGELOG.md` | `generate_changelog.py` |
| Sprint Summary | `sprints/SPRINT-NN-summary.md` | Manual (template in `sprints/`) |

---

## 🐛 Troubleshooting

### Hook not running

```bash
# Verify hooks are enabled
git config core.hooksPath
# Should show: .githooks

# Re-enable if needed
git config core.hooksPath .githooks
```

### Permission denied (Mac/Linux)

```bash
# Make hooks executable
chmod +x .githooks/*
```

### Python script not found

```bash
# Verify script exists
ls -la C:/devop/.template-system/scripts/

# Run manually to test
python C:/devop/.template-system/scripts/generate_session_doc.py --help
```

### Commit blocked by validation

**Read the error message carefully.** Common issues:

1. **Unreplaced placeholders**: Search for `{{` and replace with actual values
2. **Invalid commit message**: Use format `type(scope): description`
3. **Secret file**: Don't commit `.env.local` - it's in `.gitignore`

---

## 🔗 References

- **Conventional Commits:** https://www.conventionalcommits.org/
- **Keep a Changelog:** https://keepachangelog.com/
- **Git Hooks:** https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks
- **Documentation Guide:** `DOCUMENTATION-GUIDELINES.md`
- **Style Guide:** `STYLE-GUIDE.md`

---

**Version:** 2.0 (with auto-fix)
**Last Updated:** 2025-11-07
