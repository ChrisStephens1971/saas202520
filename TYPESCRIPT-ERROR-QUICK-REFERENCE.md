# TypeScript Error Quick Reference Guide
**For:** saas202520 and similar Next.js/Prisma/TypeScript projects
**Based on:** Nov 11-12, 2025 error-fixing sessions (34 errors resolved)

---

## Common Errors & Solutions

### 1. "Object is possibly 'null'"

**Cause:** TypeScript strict null checks don't recognize ternary checks

**Solution:** Use temporary variables
```typescript
// ❌ WRONG - Error on second access
const value = obj.field
  ? parseFloat(obj.field.toString())
  : 0;

// ✅ CORRECT - Explicit null check
const temp = obj.field;
const value = temp ? parseFloat(temp.toString()) : 0;
```

---

### 2. "Type 'never[]' is not assignable..."

**Cause:** Empty array without type annotation

**Solution:** Add explicit type
```typescript
// ❌ WRONG - Inferred as never[]
const items = [];

// ✅ CORRECT - Explicit type
const items: Array<{
  id: string;
  value: number;
}> = [];
```

---

### 3. "Property 'X' does not exist in type 'YWhereInput'"

**Cause:** Prisma field name mismatch

**Solution:** Check schema first
```bash
# Check schema
cat packages/database/prisma/schema.prisma | grep -A 10 "model User"
```

```typescript
// ❌ WRONG - Field name doesn't match schema
where: { cohort: month }

// ✅ CORRECT - Use actual schema field name
where: { cohortMonth: month }
```

---

### 4. "This expression is not callable"

**Cause:** Parameter shadows imported function

**Solution:** Rename parameter
```typescript
// ❌ WRONG - 'format' shadows date-fns format()
function process(format: string) {
  const date = format(new Date(), 'yyyy-MM-dd');  // Tries to call string!
}

// ✅ CORRECT - Use descriptive name
function process(fileFormat: string) {
  const date = format(new Date(), 'yyyy-MM-dd');  // Calls date-fns
}
```

---

### 5. "Module has no exported member 'default'"

**Cause:** Re-exporting default from module with only named exports

**Solution:** Remove incorrect default re-exports
```typescript
// ❌ WRONG - Module only has named exports
export { default as Service } from './service';

// ✅ CORRECT - Re-export named exports or remove
export * from './service';
// OR: import * as Service from './service';
```

---

### 6. "Property 'X' is missing in type..."

**Cause:** Interface requires fields you didn't provide

**Solution:** Add all required fields
```typescript
// ❌ WRONG - Missing required fields
const options = {
  title: 'Report',
};

// ✅ CORRECT - All required fields present
const options = {
  tenantId: data.tenantId,
  dateRange: data.dateRange,
  title: 'Report',
};
```

---

### 7. "Type 'unknown' is not assignable..."

**Cause:** Insufficient type assertion for complex types

**Solution:** Add explicit type assertion
```typescript
// ❌ WRONG - Type not specific enough
breakdown: data.breakdown || []

// ✅ CORRECT - Explicit type assertion
breakdown: (data.breakdown || []) as Array<{
  date: Date;
  amount: number;
  type: string;
}>
```

---

### 8. "Property 'X' does not exist. Did you mean 'Y'?"

**Cause:** Typo in API method name

**Solution:** Use exact API method name
```typescript
// ❌ WRONG - Method name typo
nodemailer.createTransporter(config)

// ✅ CORRECT - Correct method name
nodemailer.createTransport(config)
```

---

## Workflow for Fixing TypeScript Errors

### Step 1: Read the Error Message
```bash
# Run build and capture errors
pnpm build 2>&1 | grep -E "(Type error|ERROR)"
```

### Step 2: Locate the Problem
- Note file path and line number
- Read surrounding code context
- Understand what the code is trying to do

### Step 3: Identify Root Cause
**Common Root Causes:**
- Null safety issue → Use temporary variable
- Type inference failure → Add explicit type
- Field name mismatch → Check Prisma schema
- Shadowing → Rename parameter
- Missing fields → Add required fields
- Wrong type assertion → Be more specific

### Step 4: Apply Fix
- Make minimal change to fix root cause
- Don't just add `as any` everywhere
- Maintain type safety

### Step 5: Verify Fix
```bash
# Build again to verify
pnpm build
```

### Step 6: Commit
```bash
git add <file>
git commit -m "fix: <concise description>"
```

---

## Debugging Commands

### Check Prisma Schema
```bash
# View specific model
cat packages/database/prisma/schema.prisma | grep -A 20 "model YourModel"

# Search for field name
cat packages/database/prisma/schema.prisma | grep "fieldName"
```

### Find File with Error
```bash
# Search for function/variable
grep -r "functionName" apps/web/

# Find files with specific import
grep -r "import.*SomeModule" apps/web/
```

### Check Type Definitions
```bash
# Find interface definition
grep -r "interface YourInterface" apps/web/
```

---

## Common Prisma Patterns

### Decimal Fields
```typescript
// ✅ CORRECT - Check for null, then convert
const revenueField = aggregate.totalRevenue;
const revenue = revenueField ? Number(revenueField) : 0;

// OR using parseFloat
const revenue = revenueField ? parseFloat(revenueField.toString()) : 0;
```

### DateTime Fields
```typescript
// ✅ CORRECT - DateTime is a Date object
const month: Date = cohort.cohortMonth;

// ❌ WRONG - Don't try to parse
const month = new Date(cohort.cohortMonth);  // Unnecessary
```

### Json Fields
```typescript
// ✅ CORRECT - Type assertion from JsonValue
const requirements = (achievement.requirements as any) as YourType;

// Add null/undefined checks
const meta = achievement.metadata || {};
```

### Optional Fields
```typescript
// ✅ CORRECT - Use optional chaining
const value = data.optional?.field || defaultValue;

// ✅ CORRECT - Explicit check
if (data.optional && data.optional.field) {
  // Safe to use data.optional.field
}
```

---

## Variable Naming Best Practices

### Avoid These Names (Common Conflicts)
- `format` (conflicts with date-fns)
- `data` (too generic)
- `value` (too generic)
- `result` (too generic)
- `filter` (conflicts with Array.filter)
- `map` (conflicts with Array.map)

### Use These Instead
- `fileFormat`, `reportFormat`
- `userData`, `exportData`
- `itemValue`, `totalValue`
- `queryResult`, `fetchResult`
- `filterOptions`, `filterCriteria`
- `dataMap`, `itemMap`

---

## Type Annotation Templates

### Array of Objects
```typescript
const items: Array<{
  id: string;
  name: string;
  value: number;
}> = [];
```

### Array of Primitives
```typescript
const ids: string[] = [];
const counts: number[] = [];
```

### Promise Return Types
```typescript
async function fetchData(): Promise<{
  id: string;
  data: Record<string, unknown>;
}> {
  // ...
}
```

### Union Types
```typescript
type Status = 'pending' | 'completed' | 'failed';
const status: Status = 'pending';
```

---

## Pre-Commit Checklist

Before committing TypeScript fixes:

- [ ] Error message fully understood
- [ ] Root cause identified (not just symptom)
- [ ] Fix applied with minimal changes
- [ ] Build passes (`pnpm build`)
- [ ] No new errors introduced
- [ ] Type safety maintained (avoided `any` if possible)
- [ ] Commit message describes what was fixed
- [ ] Only one fix per commit (for clarity)

---

## When to Use Type Assertions

### ✅ USE Type Assertions When:
- Working with Prisma Json fields
- Complex nested structures from external APIs
- TypeScript can't infer but you know the type
- Interfacing with untyped libraries

### ❌ AVOID Type Assertions When:
- You're not sure what the type is
- It's hiding an actual type mismatch
- You could fix it with proper typing
- You're using `as any` without a good reason

---

## Emergency: "Too Many Errors!"

If you see 50+ errors at once:

1. **Don't panic** - Fix them one at a time
2. **Group similar errors** - Often the same root cause
3. **Start with imports/types** - Cascade fixes
4. **Fix one file completely** - Then move to next
5. **Commit frequently** - After each file or related group
6. **Check Prisma schema** - Many errors from field mismatches

---

## Quick Reference: Error → Solution

| Error Pattern | Most Likely Fix |
|---------------|-----------------|
| "possibly 'null'" | Temporary variable |
| "type 'never[]'" | Explicit type annotation |
| "does not exist in type" | Check Prisma schema |
| "not callable" | Rename parameter |
| "has no exported member" | Check export syntax |
| "missing in type" | Add required fields |
| "unknown is not assignable" | More specific type assertion |
| "Did you mean 'X'?" | Fix typo |

---

## Resources

- **Prisma Schema:** `packages/database/prisma/schema.prisma`
- **Session Docs:** `SESSION-2025-11-12-typescript-fixes-continued.md`
- **Summary:** `TYPESCRIPT-FIXES-SUMMARY.md`
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Prisma Docs:** https://www.prisma.io/docs/

---

**Last Updated:** 2025-11-12
**Based On:** 34 real errors fixed across 30+ files
**Success Rate:** 97% (34/35 errors resolved)
