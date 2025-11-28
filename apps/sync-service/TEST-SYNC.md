# Y.js Sync Testing Guide

## Current Status

✅ **Sync service running on port 8020**

## Quick Test (Manual)

### Option 1: Open in Default Browser

1. Open `test-client.html` in your default browser:

   ```bash
   start apps/sync-service/test-client.html
   ```

2. Open a second window with the SAME room:

   ```bash
   start apps/sync-service/test-client.html
   ```

3. Open a third window with a DIFFERENT room (isolated sync):
   ```bash
   start apps/sync-service/test-client.html?room=2
   ```

### Option 2: Manual Testing

1. Navigate to `C:\devop\saas202520\apps\sync-service\test-client.html`
2. Open it in multiple browser windows/tabs
3. Test synchronization by:
   - Adding players in one window → Should appear in other windows
   - Updating scores in one window → Should sync to other windows
   - Clearing data in one window → Should clear in other windows

## Test Scenarios

### Scenario 1: Basic Sync

1. **Window A**: Add player "Alice"
2. **Window B**: Verify "Alice" appears
3. **Window B**: Add player "Bob"
4. **Window A**: Verify "Bob" appears
   ✅ **Expected**: Both players visible in both windows

### Scenario 2: Score Updates

1. **Window A**: Click "Random Score Update"
2. **Window B**: Verify match appears with score
3. **Window B**: Click "Random Score Update"
4. **Window A**: Verify new match appears
   ✅ **Expected**: All matches visible in both windows

### Scenario 3: Real-time Sync

1. **Window A**: Add multiple players rapidly
2. **Window B**: Watch players appear in real-time
   ✅ **Expected**: Sub-second synchronization

### Scenario 4: Offline Recovery

1. **Window A**: Add players
2. **Window B**: Disconnect WiFi or stop sync service
3. **Window A**: Add more players
4. **Window B**: Reconnect
   ✅ **Expected**: Window B catches up with all changes

### Scenario 5: Conflict-Free Merge

1. **Window A**: Add player "Alice"
2. **Window B**: Add player "Bob" (at same time)
3. **Both**: Verify both players appear
   ✅ **Expected**: No data loss, both players visible

### Scenario 6: Room Isolation

1. **Window A**: Default room (no ?room param)
2. **Window B**: Room 2 (?room=2)
3. **Window A**: Add player "Alice"
4. **Window B**: Verify "Alice" does NOT appear
5. **Window B**: Add player "Bob"
6. **Window A**: Verify "Bob" does NOT appear
   ✅ **Expected**: Rooms are isolated, no cross-room sync

## Validation Checklist

- [ ] Multiple clients connect successfully
- [ ] Changes sync in real-time (<1 second)
- [ ] Player additions sync correctly
- [ ] Score updates sync correctly
- [ ] Events log tracks all changes
- [ ] No data loss on concurrent edits
- [ ] Room isolation works (different ?room params)
- [ ] WebSocket reconnection works after disconnect

## What to Look For

**✅ Good signs:**

- "Connected to sync service" status in green
- Changes appear in other windows within 1 second
- Event log shows all actions
- No console errors

**❌ Bad signs:**

- "Disconnected" status
- Changes don't sync between windows
- Console errors about WebSocket
- Data disappears or duplicates

## Current Implementation Details

**Service:**

- WebSocket server: `ws://localhost:8020`
- Y.js sync protocol with awareness
- Room-based isolation
- Automatic cleanup of empty rooms

**Client:**

- Y.js document with shared maps (tournament, players, matches, tables)
- Y.js array for append-only events
- WebSocket provider for real-time sync
- Auto-reconnection on disconnect

## Service Logs

Check sync service output for:

```
[Room test-tournament-1] Connection added, total: 2
[Room test-tournament-1] Document updated, size: 142 bytes
```

## Next Steps

After manual validation passes:

1. Create automated test suite (Vitest + WebSocket client)
2. Add IndexedDB persistence layer
3. Test offline → online sync with persistence
4. Implement conflict resolution edge cases

## Notes

- Warning about "Yjs was already imported" is expected (multiple import paths)
- Room names are auto-generated as `test-tournament-<number>`
- Event log shows last 5 events only (UI limitation)
