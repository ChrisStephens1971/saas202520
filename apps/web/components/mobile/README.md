# Mobile UI Components

Touch-optimized mobile components with swipe gestures and haptic feedback.

**Sprint 10 Week 4 - Agent 2: Mobile UI Components**

## Components Overview

### 1. TouchFeedback

Visual and haptic feedback for touch interactions.

**Features:**

- Visual ripple effect on tap
- Haptic feedback (vibration)
- Scale animation on press
- Long-press detection
- Disabled state handling
- WCAG 2.1 compliant (≥44x44px touch targets)

**Usage:**

```tsx
import { TouchFeedback } from '@/components/mobile';

<TouchFeedback
  onPress={() => console.log('Pressed')}
  onLongPress={() => console.log('Long pressed')}
  hapticType="medium"
  showRipple={true}
>
  <button>Click me</button>
</TouchFeedback>;
```

**Props:**

- `onPress?: (e) => void` - Called on tap/click
- `onLongPress?: (e) => void` - Called on long press (default 500ms)
- `hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'`
- `disabled?: boolean` - Disable interaction
- `pressScale?: number` - Scale on press (default 0.95)
- `showRipple?: boolean` - Show ripple effect (default true)
- `longPressDuration?: number` - Long press duration in ms (default 500)

---

### 2. SwipeableCard

Card with swipe gesture support for actions and navigation.

**Features:**

- Swipe left/right for actions
- Swipe up/down for navigation
- Spring animations
- Threshold detection (30% default)
- Visual feedback with color overlay
- Alternative buttons for accessibility

**Usage:**

```tsx
import { SwipeableCard } from '@/components/mobile';
import { Trash, Archive } from 'lucide-react';

<SwipeableCard
  leftAction={{
    icon: <Archive />,
    label: 'Archive',
    color: '#3b82f6',
    onAction: () => console.log('Archived'),
    haptic: 'medium',
  }}
  rightAction={{
    icon: <Trash />,
    label: 'Delete',
    color: '#ef4444',
    onAction: () => console.log('Deleted'),
    haptic: 'heavy',
  }}
  onSwipeUp={() => console.log('View details')}
  onSwipeDown={() => console.log('Refresh')}
  threshold={0.3}
>
  <div className="p-4">Card content</div>
</SwipeableCard>;
```

**Props:**

- `leftAction?: SwipeAction` - Action when swiping right
- `rightAction?: SwipeAction` - Action when swiping left
- `onSwipeUp?: () => void` - Called on swipe up
- `onSwipeDown?: () => void` - Called on swipe down
- `threshold?: number` - Swipe threshold percentage (0-1, default 0.3)
- `disabled?: boolean` - Disable swiping
- `enableVerticalSwipe?: boolean` - Enable vertical swipes (default false)

**SwipeAction Interface:**

```ts
interface SwipeAction {
  icon?: React.ReactNode;
  label: string;
  color: string;
  onAction: () => void;
  haptic?: 'light' | 'medium' | 'heavy';
}
```

---

### 3. BottomSheet

Mobile-optimized bottom sheet modal with drag-to-dismiss.

**Features:**

- Drag down to close
- Multiple snap points support
- Smooth spring animations
- Touch-optimized header
- Auto-focus management
- Backdrop blur
- Focus trap
- ESC key to close

**Usage:**

```tsx
import { BottomSheet } from '@/components/mobile';

const [isOpen, setIsOpen] = useState(false);

<BottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Match Details"
  height={60}
  snapPoints={[90, 60, 30]}
>
  <div>Bottom sheet content</div>
</BottomSheet>;
```

**Props:**

- `isOpen: boolean` - Control visibility
- `onClose: () => void` - Called when closing
- `title?: string` - Optional title in header
- `height?: 'full' | 'auto' | number` - Height percentage (default 'auto')
- `snapPoints?: number[]` - Snap position percentages (default [90])
- `enableDrag?: boolean` - Enable drag to dismiss (default true)

---

### 4. TouchOptimizedButton

Button optimized for touch interfaces with haptic feedback.

**Features:**

- WCAG 2.1 compliant (≥44x44px)
- Haptic feedback
- Loading states
- Multiple variants and sizes
- Icon support
- Full-width option

**Usage:**

```tsx
import { TouchOptimizedButton } from '@/components/mobile';
import { Plus } from 'lucide-react';

<TouchOptimizedButton
  variant="primary"
  size="lg"
  onClick={() => console.log('Clicked')}
  icon={<Plus />}
  iconPosition="left"
  hapticType="medium"
  loading={false}
  fullWidth={true}
>
  Add Match
</TouchOptimizedButton>;
```

**Props:**

- `variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'`
- `size?: 'sm' | 'md' | 'lg'` - sm:44px, md:48px, lg:56px min height
- `onClick?: (e) => void` - Click handler
- `disabled?: boolean` - Disable button
- `loading?: boolean` - Show loading spinner
- `fullWidth?: boolean` - Full width button
- `hapticType?: HapticFeedbackType` - Haptic feedback type
- `icon?: React.ReactNode` - Icon element
- `iconPosition?: 'left' | 'right'` - Icon position
- `ariaLabel?: string` - Accessibility label

---

## Haptic Feedback Utilities

### Basic Usage

```tsx
import { triggerHaptic, gameHaptics } from '@/components/mobile';

// Basic haptic feedback
triggerHaptic('light'); // Light tap
triggerHaptic('medium'); // Medium tap
triggerHaptic('heavy'); // Heavy tap
triggerHaptic('success'); // Success pattern
triggerHaptic('error'); // Error pattern

// Game-specific haptics
gameHaptics.scorePoint(); // Light tap for scoring
gameHaptics.winGame(); // Success pattern for game win
gameHaptics.winMatch(); // Celebration pattern for match win
gameHaptics.undo(); // Medium tap for undo
gameHaptics.buttonPress(); // Light tap for buttons
gameHaptics.swipe(); // Selection feedback for swipes
```

### React Hook

```tsx
import { useHaptic } from '@/components/mobile';

function MyComponent() {
  const haptic = useHaptic();

  return <button onClick={() => haptic.trigger('medium')}>Click me</button>;
}
```

### Check Support and Preferences

```tsx
import { isHapticSupported, isHapticEnabled, setHapticEnabled } from '@/components/mobile';

// Check if device supports haptics
if (isHapticSupported()) {
  console.log('Haptics available');
}

// Check user preference
if (isHapticEnabled()) {
  console.log('User has haptics enabled');
}

// Set user preference
setHapticEnabled(false); // Disable haptics
```

### Custom Patterns

```tsx
import { triggerCustomHaptic } from '@/components/mobile';

// Format: [vibrate, pause, vibrate, pause, ...]
// All values in milliseconds

// Short pulse
triggerCustomHaptic([10]);

// Double tap
triggerCustomHaptic([10, 50, 10]);

// SOS pattern
triggerCustomHaptic([100, 100, 100, 100, 100, 200, 200, 100, 200, 100, 200, 200, 100, 100, 100]);
```

---

## Page Components

### Mobile Tournament View

Touch-optimized tournament bracket view with swipe navigation.

**Location:** `app/(mobile)/tournaments/[id]/mobile-view.tsx`

**Features:**

- Touch-optimized bracket visualization
- Swipe between rounds
- Pull-to-refresh
- Bottom sheet for match details
- Floating action button
- Responsive card layout

**Usage:**

```tsx
import { MobileTournamentView } from '@/app/(mobile)/tournaments/[id]/mobile-view';

<MobileTournamentView
  tournament={tournamentData}
  onRefresh={async () => {
    // Refresh tournament data
  }}
/>;
```

---

### Mobile Scorer

Touch-optimized score keeper with large tap targets.

**Location:** `app/(mobile)/scoring/mobile-scorer.tsx`

**Features:**

- Large tap targets (60x60px minimum)
- Swipe to undo last action
- Haptic feedback on score changes
- Quick score buttons
- Confirmation dialog
- Score history

**Usage:**

```tsx
import { MobileScorer } from '@/app/(mobile)/scoring/mobile-scorer';

<MobileScorer
  match={{
    id: 'match-1',
    player1: { id: '1', name: 'Player 1' },
    player2: { id: '2', name: 'Player 2' },
    format: {
      gamesToWin: 3,
      pointsToWin: 9,
    },
  }}
  onComplete={(winnerId, scores) => {
    console.log('Match completed', winnerId, scores);
  }}
  onCancel={() => {
    console.log('Scoring cancelled');
  }}
/>;
```

---

## Accessibility

All components meet WCAG 2.1 Level AA standards:

### Touch Targets

- **Minimum size:** 44x44px (WCAG 2.1)
- **Primary actions:** 60x60px for critical interactions
- **Spacing:** Adequate spacing between interactive elements

### Visual Feedback

- Non-haptic visual feedback provided
- Clear pressed/active states
- Color contrast ratios meet standards

### Screen Readers

- Proper ARIA labels and roles
- Screen reader announcements
- Alternative action methods (buttons for swipe actions)

### Keyboard Navigation

- All interactive elements focusable
- Logical tab order
- Enter/Space key support
- ESC key for dismissing modals

---

## Best Practices

### 1. Touch Target Sizing

```tsx
// ✅ Good - Meets minimum size
<TouchOptimizedButton size="md">Click</TouchOptimizedButton>

// ❌ Bad - Too small
<button className="p-1 text-xs">Click</button>
```

### 2. Haptic Feedback Usage

```tsx
// ✅ Good - Appropriate feedback for action
<TouchOptimizedButton
  hapticType="medium"
  onClick={handleImportantAction}
>
  Submit
</TouchOptimizedButton>

// ❌ Bad - Overuse creates fatigue
<div>
  {items.map(item => (
    <TouchFeedback hapticType="heavy"> {/* Too intense */}
      <span>{item}</span>
    </TouchFeedback>
  ))}
</div>
```

### 3. Swipe Gestures

```tsx
// ✅ Good - Provide visual hints and alternatives
<SwipeableCard
  leftAction={{ label: 'Archive', /* ... */ }}
  rightAction={{ label: 'Delete', /* ... */ }}
>
  <div>
    Card content
    {/* Alternative buttons visible or in menu */}
  </div>
</SwipeableCard>

// ❌ Bad - No alternative for non-swipe users
<SwipeableCard
  leftAction={{ label: 'Archive', /* ... */ }}
>
  <div>Only accessible via swipe</div>
</SwipeableCard>
```

### 4. Bottom Sheets

```tsx
// ✅ Good - Appropriate height and focus management
<BottomSheet
  isOpen={isOpen}
  onClose={handleClose}
  title="Clear title"
  height={60}
>
  <form>
    {/* Focusable elements */}
  </form>
</BottomSheet>

// ❌ Bad - Full height blocks entire screen
<BottomSheet height="full"> {/* Use sparingly */}
  <div>Simple content</div>
</BottomSheet>
```

---

## Performance Considerations

### Animation Performance

- Uses `transform` and `opacity` for hardware acceleration
- Avoids layout thrashing
- Spring animations are optimized with framer-motion

### Touch Responsiveness

- Touch events handled with `touchstart`/`touchend`
- Prevents 300ms click delay with `touch-action: manipulation`
- Gesture recognition optimized for mobile

### Memory Management

- Haptic feedback patterns reused
- Event listeners cleaned up on unmount
- History limited to recent actions

---

## Browser Support

### Haptic Feedback (Vibration API)

- ✅ Chrome/Edge (Android)
- ✅ Firefox (Android)
- ✅ Samsung Internet
- ❌ iOS Safari (no Vibration API support)
- Gracefully degrades to visual feedback only

### Touch Events

- ✅ All modern mobile browsers
- ✅ iOS Safari
- ✅ Chrome/Firefox/Edge mobile

### Recommended Testing

- Chrome DevTools mobile emulation
- Real device testing (iOS and Android)
- Various screen sizes (320px to 768px)

---

## Migration Guide

### From Regular Buttons

```tsx
// Before
<button
  onClick={handleClick}
  className="px-4 py-2"
>
  Click me
</button>

// After
<TouchOptimizedButton
  onClick={handleClick}
  variant="primary"
  size="md"
  hapticType="light"
>
  Click me
</TouchOptimizedButton>
```

### From Standard Modals

```tsx
// Before
<Dialog open={isOpen} onClose={setIsOpen}>
  <DialogContent>
    Content here
  </DialogContent>
</Dialog>

// After
<BottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Title"
>
  Content here
</BottomSheet>
```

---

## Testing

### Unit Tests

```tsx
import { render, fireEvent } from '@testing-library/react';
import { TouchFeedback } from '@/components/mobile';

test('triggers haptic on press', () => {
  const onPress = jest.fn();
  const { getByRole } = render(
    <TouchFeedback onPress={onPress}>
      <button>Press me</button>
    </TouchFeedback>
  );

  fireEvent.touchStart(getByRole('button'));
  fireEvent.touchEnd(getByRole('button'));

  expect(onPress).toHaveBeenCalled();
});
```

### Integration Tests

```tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MobileScorer } from '@/app/(mobile)/scoring/mobile-scorer';

test('scores points correctly', async () => {
  const onComplete = jest.fn();
  const { getByLabelText } = render(<MobileScorer match={mockMatch} onComplete={onComplete} />);

  // Simulate scoring
  fireEvent.click(getByLabelText('Increase score'));

  await waitFor(() => {
    expect(getByText('1')).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Haptics Not Working

1. Check device support: `isHapticSupported()`
2. Check user preference: `isHapticEnabled()`
3. Verify browser (iOS Safari doesn't support Vibration API)
4. Check if running over HTTPS (required for some browsers)

### Touch Targets Too Small

1. Ensure minimum 44x44px: `style={{ minWidth: '44px', minHeight: '44px' }}`
2. Use TouchOptimizedButton for consistent sizing
3. Check parent container constraints

### Swipes Not Registering

1. Check threshold setting (default 0.3 = 30%)
2. Verify touch-action CSS property
3. Ensure parent doesn't capture touch events
4. Check for conflicting scroll handlers

### Bottom Sheet Focus Issues

1. Ensure content has focusable elements
2. Check for focus trap conflicts
3. Verify ARIA attributes
4. Test ESC key behavior

---

## Future Enhancements

### Planned Features

- [ ] Multi-touch gestures (pinch, rotate)
- [ ] Gesture customization per user
- [ ] Advanced haptic patterns
- [ ] Voice feedback option
- [ ] Gesture recording/playback
- [ ] Touch heatmap analytics

### Experimental Features

- Force touch detection (where supported)
- Gesture shortcuts
- Contextual haptics based on game state
- Adaptive touch targets based on accuracy

---

## Contributing

When adding new mobile components:

1. **Follow touch target guidelines** (≥44x44px)
2. **Add haptic feedback** where appropriate
3. **Include visual alternatives** for haptics
4. **Test on real devices** (iOS and Android)
5. **Document accessibility** features
6. **Add usage examples** to this README

---

## Support

For issues or questions:

- Check this documentation first
- Review accessibility guidelines: WCAG 2.1 Level AA
- Test on target devices before reporting bugs
- Include device/browser info in bug reports

---

**Version:** 1.0.0
**Sprint:** 10 Week 4
**Last Updated:** 2025-11-07
