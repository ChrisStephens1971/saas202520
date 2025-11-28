# Component Library Documentation

Comprehensive guide to using the tournament platform's component library.

## Table of Contents

- [Form Validation](#form-validation)
- [UI Components](#ui-components)
- [Admin Components](#admin-components)
- [Mobile Components](#mobile-components)
- [Performance](#performance)

---

## Form Validation

### Zod Validation Schemas

Location: `apps/web/lib/validations/auth.schema.ts`

#### Login Schema

```typescript
import { loginSchema } from '@/lib/validations/auth.schema';

// Validate login data
const result = loginSchema.safeParse({
  email: 'user@example.com',
  password: 'Password123',
  rememberMe: true,
});

if (result.success) {
  // Data is valid
  const { email, password } = result.data;
} else {
  // Handle validation errors
  result.error.errors.forEach((error) => {
    console.log(error.path, error.message);
  });
}
```

**Validation Rules:**

- Email: Required, valid email format, trimmed, lowercase
- Password: Required, minimum 8 characters
- RememberMe: Optional boolean

#### Signup Schema

```typescript
import { signupSchema } from '@/lib/validations/auth.schema';

const result = signupSchema.safeParse({
  email: 'user@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  name: 'John Doe',
});
```

**Validation Rules:**

- Email: Required, valid format, trimmed, lowercase
- Password:
  - Minimum 8 characters
  - Maximum 100 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain number
- ConfirmPassword: Must match password
- Name: 2-50 characters, trimmed

---

## UI Components

### ConfirmDialog

Location: `apps/web/components/ui/confirm-dialog.tsx`

Accessible confirmation dialog for destructive actions.

#### Basic Usage

```typescript
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    // Perform destructive action
    await deleteUser(userId);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}>Delete User</button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
```

#### Props

```typescript
interface ConfirmDialogProps {
  open: boolean; // Controls dialog visibility
  onClose: () => void; // Called when dialog should close
  onConfirm: () => void | Promise<void>; // Called when user confirms
  title: string; // Dialog title
  description: string; // Dialog description
  confirmText?: string; // Confirm button text (default: "Confirm")
  cancelText?: string; // Cancel button text (default: "Cancel")
  variant?: 'danger' | 'warning' | 'info'; // Visual variant (default: "danger")
  isLoading?: boolean; // Loading state (default: false)
}
```

#### Variants

**Danger** (default) - For destructive actions

```typescript
<ConfirmDialog variant="danger" />
```

- Red color scheme
- XCircle icon
- Use for: Delete, Ban, Remove operations

**Warning** - For potentially problematic actions

```typescript
<ConfirmDialog variant="warning" />
```

- Yellow color scheme
- AlertTriangle icon
- Use for: Warn, Suspend, Disable operations

**Info** - For informational confirmations

```typescript
<ConfirmDialog variant="info" />
```

- Blue color scheme
- Info icon
- Use for: General confirmations, non-destructive actions

#### Accessibility Features

- ✅ ARIA roles (`role="dialog"`, `aria-modal="true"`)
- ✅ ARIA labels (`aria-labelledby`, `aria-describedby`)
- ✅ Focus management (auto-focus confirm button)
- ✅ Keyboard navigation (Escape to cancel)
- ✅ Loading states with `aria-busy`
- ✅ Accessible button labels

---

## Admin Components

### UserRoleBadge

Location: `apps/web/components/admin/UserRoleBadge.tsx`

Displays user role with appropriate icon and styling.

#### Usage

```typescript
import UserRoleBadge from '@/components/admin/UserRoleBadge';
import { UserRole } from '@tournament/shared/types/user';

function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <span>{user.name}</span>
          <UserRoleBadge role={user.role} size="md" />
        </div>
      ))}
    </div>
  );
}
```

#### Props

```typescript
interface Props {
  role: UserRole; // 'ADMIN' | 'ORGANIZER' | 'PLAYER'
  size?: 'sm' | 'md' | 'lg'; // Default: 'md'
}
```

#### Roles & Icons

- **ADMIN** - Crown icon, purple background
- **ORGANIZER** - Target icon, blue background
- **PLAYER** - User icon, gray background

#### Performance

This component is **memoized** with `React.memo` to prevent unnecessary re-renders in tables.

---

### TournamentStatusBadge

Location: `apps/web/components/admin/TournamentStatusBadge.tsx`

Displays tournament status with color-coded styling.

#### Usage

```typescript
import { TournamentStatusBadge } from '@/components/admin/TournamentStatusBadge';

<TournamentStatusBadge
  status="active"
  size="md"
  showIcon={true}
/>
```

#### Props

```typescript
interface TournamentStatusBadgeProps {
  status: TournamentStatus; // Tournament status enum
  size?: 'sm' | 'md' | 'lg'; // Default: 'md'
  showIcon?: boolean; // Default: true
  className?: string; // Additional CSS classes
}
```

#### Status Types

| Status       | Icon          | Color  | Description                  |
| ------------ | ------------- | ------ | ---------------------------- |
| draft        | FileEdit      | Gray   | Tournament being set up      |
| registration | ClipboardList | Blue   | Open for player registration |
| active       | Target        | Green  | Tournament in progress       |
| paused       | Pause         | Yellow | Temporarily stopped          |
| completed    | Trophy        | Purple | Tournament finished          |
| cancelled    | XCircle       | Red    | Tournament cancelled         |

#### Performance

This component is **memoized** with `React.memo` for optimal table performance.

---

### UserActionMenu

Location: `apps/web/components/admin/UserActionMenu.tsx`

Dropdown menu with user moderation actions.

#### Usage

```typescript
import UserActionMenu from '@/components/admin/UserActionMenu';

<UserActionMenu
  user={user}
  onEdit={(userId) => console.log('Edit', userId)}
  onChangeRole={(userId) => console.log('Change role', userId)}
  onWarn={(userId) => console.log('Warn', userId)}
  onSuspend={(userId) => console.log('Suspend', userId)}
  onBan={(userId) => console.log('Ban', userId)}
  onUnban={(userId) => console.log('Unban', userId)}
  onUnsuspend={(userId) => console.log('Unsuspend', userId)}
  onViewDetails={(userId) => console.log('View', userId)}
/>
```

#### Built-in Confirmation Dialogs

The component includes automatic confirmation dialogs for destructive actions:

- **Warn User** - Warning variant
- **Suspend User** - Danger variant
- **Ban User** - Danger variant

Non-destructive actions (Edit, Change Role, View Details, Unban, Unsuspend) execute immediately.

---

## Mobile Components

### TouchOptimizedButton

Location: `apps/web/components/mobile/TouchOptimizedButton.tsx`

Button optimized for touch interfaces with haptic feedback.

#### Usage

```typescript
import { TouchOptimizedButton } from '@/components/mobile/TouchOptimizedButton';
import { Plus } from 'lucide-react';

<TouchOptimizedButton
  variant="primary"
  size="md"
  onClick={handleClick}
  icon={<Plus />}
  iconPosition="left"
  ariaLabel="Add tournament"
>
  Add Tournament
</TouchOptimizedButton>
```

#### Props

```typescript
interface TouchOptimizedButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  hapticType?: HapticFeedbackType;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}
```

#### Features

- ✅ WCAG 2.1 compliant (44x44px minimum)
- ✅ Haptic feedback on press
- ✅ Visual ripple effect
- ✅ Loading states
- ✅ Icon support
- ✅ Dark mode support

---

### BottomNav

Location: `apps/web/components/mobile/BottomNav.tsx`

Mobile bottom navigation bar.

#### Usage

```typescript
import BottomNav from '@/components/mobile/BottomNav';

// Automatically included in mobile layout
// No props required - uses current pathname for active state
<BottomNav />
```

#### Features

- Auto-detects active tab from pathname
- Haptic feedback on tab change
- Icons from Lucide React
- Safe area inset support
- Hidden on desktop (`md:hidden`)

---

## Performance

### Memoized Components

The following components are optimized with `React.memo`:

- **UserRoleBadge** - Prevents re-renders in user tables
- **TournamentStatusBadge** - Prevents re-renders in tournament tables

### Best Practices

#### 1. Use Memoization for Table Cells

```typescript
// Good - Component won't re-render unless role changes
<UserRoleBadge role={user.role} />

// Bad - Would re-render on every table update
{user.role === 'ADMIN' ? <AdminBadge /> : <PlayerBadge />}
```

#### 2. Validate Forms with Zod

```typescript
// Good - Type-safe validation with helpful errors
const result = loginSchema.safeParse(formData);

// Bad - Manual validation prone to errors
if (!email || !email.includes('@')) {
  setError('Invalid email');
}
```

#### 3. Use ConfirmDialog for Destructive Actions

```typescript
// Good - Prevents accidents
<ConfirmDialog
  variant="danger"
  title="Delete User"
  description="This cannot be undone"
/>

// Bad - No confirmation
<button onClick={deleteUser}>Delete</button>
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run validation schema tests
npm test auth.schema.test.ts

# Run component tests
npm test confirm-dialog.test.tsx

# Watch mode
npm test -- --watch
```

### Test Coverage

- ✅ Zod validation schemas (100% coverage)
- ✅ ConfirmDialog component (95% coverage)
- ⏳ UserActionMenu (pending)
- ⏳ Form components (pending)

---

## Accessibility

All components meet **WCAG 2.1 Level AA** standards:

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA attributes
- ✅ Focus management
- ✅ Color contrast
- ✅ Touch target sizes (44x44px minimum)

### Accessibility Testing

```bash
# Run accessibility audit
npm run test:a11y

# Manual testing checklist
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Forms have proper labels
```

---

## Migration Guide

### From Emoji to Lucide React

```typescript
// Before
<span>🏆</span>

// After
import { Trophy } from 'lucide-react';
<Trophy className="w-6 h-6" aria-hidden="true" />
```

### Adding Validation to Existing Forms

1. Create Zod schema
2. Add field-level error state
3. Update input className for error styling
4. Add error message display

See `apps/web/app/login/login-form.tsx` for complete example.

---

## Support

For questions or issues:

- Check component source code for inline documentation
- Review test files for usage examples
- See `apps/web/docs/` for additional guides
