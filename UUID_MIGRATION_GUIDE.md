## UUID-Based User-Event References Migration

### Overview
This migration converts the User-Event relationship from numeric ID-based references to UUID-based references. This improves data integrity, prevents ID collision attacks, and provides better cross-system compatibility.

---

## Changes Made

### 1. **Database Schema Changes**

#### New Migrations Created:
- **`20260413000001-add-uuid-to-users.ts`**
  - Adds `userUuid` UUID column to Users table
  - Auto-generates UUIDs for existing users
  - Creates unique index on `userUuid`

- **`20260413000002-add-uuid-to-events.ts`**
  - Adds `eventUuid` UUID column to EventTable
  - Auto-generates UUIDs for existing events
  - Creates unique index on `eventUuid`

### 2. **Model Updates**

#### User Model (`src/db/models/User.ts`)
```typescript
// Added UUID column
userUuid: string;  // Generated via v4 UUID

// Updated joinedEvents structure
joinedEvents: string[];  // Now stores array of event UUIDs instead of objects
```

#### EventTable Model (`src/db/models/EventTable.ts`)
```typescript
// Added UUID column
eventUuid: string;  // Generated via v4 UUID

// Updated participants structure
participants: string[];  // Now stores array of user UUIDs instead of objects
```

### 3. **API Handler Updates**

#### `joinEventHandler`
- **Before:** Stored participant objects with userId + name + email + joinedAt
- **After:** Stores only user UUIDs in participants array
- **Before:** Stored event objects in user.joinedEvents
- **After:** Stores only event UUIDs in user.joinedEvents
- Returns: eventUuid and participantUuids in response

#### `leaveEventHandler`
- Now filters by UUID instead of userId
- Removes user UUID from participants array
- Removes event UUID from user's joinedEvents array

#### `getEventParticipantsHandler`
- **Enhancement:** Now retrieves full user details (name, email) from UUIDs
- Returns: Both participantUuids array and resolved participant details

#### `getUserJoinedEventsHandler`
- **Enhancement:** Now retrieves full event details (name, location, date) from UUIDs
- Returns: Both joinedEventUuids array and resolved event details

#### `getDashboardHandler`
- Updated to work with event UUIDs instead of numeric IDs
- Includes userUuid in profile
- Returns eventUuid in events joined list

### 4. **Package Dependencies**

Added to `package.json`:
```json
"dependencies": {
  "uuid": "^9.0.0"
},
"devDependencies": {
  "@types/uuid": "^9.0.0"
}
```

---

## Running the Migrations

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set migration environment variable:**
   ```bash
   export RUN_DB_MIGRATION=true
   ```

3. **Start the application (migrations will run automatically):**
   ```bash
   npm run dev
   ```

   Or for production:
   ```bash
   npm run build
   npm start
   ```

---

## Data Structure Changes

### User.joinedEvents
**Before:**
```json
[
  {
    "eventId": 1,
    "eventName": "Park Cleanup",
    "joinedAt": "2026-04-13T10:00:00Z"
  }
]
```

**After:**
```json
[
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
]
```

### Event.participants
**Before:**
```json
[
  {
    "userId": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "joinedAt": "2026-04-13T10:00:00Z"
  }
]
```

**After:**
```json
[
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
]
```

---

## API Response Changes

### Join Event Response
**After:**
```json
{
  "message": "Successfully joined the event: Park Cleanup",
  "success": true,
  "data": {
    "eventId": 5,
    "eventUuid": "550e8400-e29b-41d4-a716-446655440000",
    "eventName": "Park Cleanup",
    "totalParticipants": 12,
    "participantUuids": [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002"
    ]
  }
}
```

### Get Event Participants Response
**After:**
```json
{
  "eventId": 5,
  "eventUuid": "550e8400-e29b-41d4-a716-446655440000",
  "eventName": "Park Cleanup",
  "joinsCount": 12,
  "participantUuids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "participants": [
    {
      "userId": 1,
      "userUuid": "550e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

### Get User Joined Events Response
**After:**
```json
{
  "userId": 1,
  "userUuid": "550e8400-e29b-41d4-a716-446655440001",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "totalEventsJoined": 3,
  "joinedEventUuids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  ],
  "joinedEvents": [
    {
      "eventId": 5,
      "eventUuid": "550e8400-e29b-41d4-a716-446655440000",
      "eventName": "Park Cleanup",
      "location": "Central Park",
      "eventDate": "2026-04-20",
      "participantsCount": 12
    }
  ]
}
```

---

## Benefits

✅ **Better Security:** UUIDs prevent easy ID prediction attacks  
✅ **Improved Scalability:** No risk of numeric ID collisions across systems  
✅ **Data Integrity:** Relationships are now strongly typed as UUIDs  
✅ **Cross-System Compatibility:** UUIDs are universally unique and can be shared with external systems  
✅ **Cleaner Data:** Array stores only the essential UUID values, not duplicate user/event details  

---

## Backward Compatibility Notes

⚠️ **Breaking Changes:**
- API responses now include `userUuid` and `eventUuid` fields
- `joinedEvents` and `participants` array structures have changed from objects to UUID strings
- Client applications need to be updated to handle the new response formats

✅ **Preserved:**
- Numeric `id` and `eventId` fields are still available and unchanged
- All existing endpoints remain at the same paths
- Database numeric IDs continue to work for internal references

---

## Testing

After running migrations, verify:

1. **Check UUID columns exist:**
   ```sql
   SELECT id, userUuid FROM Users LIMIT 1;
   SELECT eventId, eventUuid FROM EventTable LIMIT 1;
   ```

2. **Test join event flow:**
   - User joins event
   - Verify `User.joinedEvents` contains event UUID
   - Verify `Event.participants` contains user UUID

3. **Test leave event flow:**
   - User leaves event
   - Verify UUIDs are removed from both arrays
   - Verify joinsCount is decremented

4. **Test retrieval endpoints:**
   - Get user joined events (should include event details)
   - Get event participants (should include user details)
   - Get dashboard (should show event UUIDs)

---

## Troubleshooting

### Issue: Migration fails with UUID generation error
**Solution:** Ensure `UUID()` function is supported by your database:
- MySQL: Use MySQL 8.0+
- PostgreSQL: Extension `uuid-ossp` should be available
- SQLite: Uses `randomblob()` approach (for testing only)

### Issue: Events showing empty participants after migration
**Solution:** Run migration with `RUN_DB_MIGRATION=true` environment variable set to ensure data is properly populated.

### Issue: Client returns "participantUuids is undefined"
**Solution:** Old endpoints may still be returning the object format. Ensure you've updated to the latest handler code.

