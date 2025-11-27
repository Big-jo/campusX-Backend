# NATS Integration - Core Service

**ML Service Interest Tracking Integration**

---

## Overview

Core service now publishes user interaction events to NATS for ML service to track user interests and personalize content recommendations.

---

## Integration Points

### 1. View Tracking

**When:** User views a post with linked content
**File:** `src/services/v2/posts.service.ts` - `getPost()`

```typescript
// Automatically tracks when user views a post
if (natsClient.isConnected() && post.contentId) {
  await natsClient.trackView(userId, contentId, postId);
}
```

**Event Published:**
```json
{
  "user_id": "user123",
  "content_id": "content456",
  "post_id": "post789",
  "interaction_type": "view",
  "timestamp": "2025-11-25T10:30:00Z"
}
```

**Subject:** `user.interaction.view`

### 2. Like Tracking

**When:** User likes a post with linked content
**File:** `src/services/v2/posts.service.ts` - `likePost()`

```typescript
// Automatically tracks when user likes a post
if (natsClient.isConnected() && post.contentId) {
  await natsClient.trackLike(userId, contentId, postId);
}
```

**Event Published:**
```json
{
  "user_id": "user123",
  "content_id": "content456",
  "post_id": "post789",
  "interaction_type": "like",
  "timestamp": "2025-11-25T10:30:00Z"
}
```

**Subject:** `user.interaction.like`

---

## NATS Client API

**File:** `src/lib/nats.ts`

### Core Methods

```typescript
// Connect to NATS
await natsClient.connect('nats://localhost:4222');

// Check connection
const connected = natsClient.isConnected();

// Publish interaction (low-level)
await natsClient.publishUserInteraction({
  user_id: userId,
  content_id: contentId,
  post_id: postId, // optional
  interaction_type: 'like',
  timestamp: new Date().toISOString()
});
```

### Convenience Methods

```typescript
// Track view
await natsClient.trackView(userId, contentId, postId);

// Track like
await natsClient.trackLike(userId, contentId, postId);

// Track comment
await natsClient.trackComment(userId, contentId, postId);

// Track bookmark
await natsClient.trackBookmark(userId, contentId, postId);

// Track share
await natsClient.trackShare(userId, contentId, postId);
```

---

## Interaction Weights (ML Service)

ML service assigns weights to different interaction types:

| Type | Weight | Meaning |
|------|--------|---------|
| `view` | 0.1 | Passive interest |
| `like` | 0.5 | Positive engagement |
| `comment` | 0.7 | Active engagement |
| `bookmark` | 0.8 | Strong interest |
| `share` | 1.0 | Maximum interest |

---

## Configuration

### Environment Variables

```bash
# .env
NATS_URL=nats://localhost:4222
```

### Connection Lifecycle

```typescript
// Auto-connect on app startup
import { natsClient } from '@lib';

await natsClient.connect(process.env.NATS_URL);

// Auto-reconnect on disconnect
// Handles reconnection automatically with exponential backoff
```

---

## Error Handling

### Graceful Degradation

All interaction tracking is **fire-and-forget** and **non-blocking**:

```typescript
if (natsClient.isConnected()) {
  natsClient.trackLike(userId, contentId, postId).catch(err => {
    console.error('Failed to track interaction:', err);
    // Logged but does not throw - user experience not affected
  });
}
```

**Benefits:**
- User actions succeed even if NATS is down
- No performance impact on main operations
- Interactions can be backfilled later

---

## Testing

### Manual Testing

```typescript
// Publish test event
await natsClient.publishUserInteraction({
  user_id: 'test_user_123',
  content_id: 'content_456',
  interaction_type: 'like',
  timestamp: new Date().toISOString()
});
```

### Check ML Service Logs

ML service logs should show:

```
Processed like from user test_user_123 on content content_456 (weight=0.5)
Tracked like for user test_user_123, category Technology (weight 0.50)
```

---

## When Tracking Happens

### Posts with contentId

Only posts linked to ML service content (`contentId` field) are tracked:

```typescript
// Post created from bot with contentId
{
  _id: "post123",
  contentId: "content456", // ← Must exist for tracking
  author: "user789",
  text: "Great article!",
  ...
}
```

### Posts without contentId

Regular user posts (no contentId) are **not tracked** - they don't represent interaction with discovered content.

---

## Data Flow

```
1. User Action (like, view, etc.)
   ↓
2. Core Service Handler (likePost(), getPost())
   ↓
3. NATS Client Publishes Event
   ↓
4. NATS Server (nats://localhost:4222)
   ↓
5. ML Service Interaction Service Receives Event
   ↓
6. Interest Tracker Updates User Profile
   ↓
7. MongoDB: userinterests collection updated
   ↓
8. Qdrant: User embedding updated
   ↓
9. Personalization: Better recommendations next time
```

---

## Adding New Interaction Types

### 1. Add to Interface

```typescript
// src/lib/nats.ts
interface UserInteractionEvent {
  user_id: string;
  content_id: string;
  post_id?: string;
  interaction_type: 'view' | 'like' | 'comment' | 'bookmark' | 'share' | 'YOUR_NEW_TYPE';
  timestamp: string;
}
```

### 2. Add Convenience Method

```typescript
async trackYourNewType(userId: string, contentId: string, postId?: string): Promise<void> {
  await this.publishUserInteraction({
    user_id: userId,
    content_id: contentId,
    post_id: postId,
    interaction_type: 'YOUR_NEW_TYPE',
    timestamp: new Date().toISOString(),
  });
}
```

### 3. Add Weight in ML Service

```python
# ML service: src/interest_graph/interaction_service.py
self.interaction_weights = {
    "view": 0.1,
    "like": 0.5,
    "YOUR_NEW_TYPE": 0.X,  # ← Add your weight
}
```

### 4. Call from Service

```typescript
// src/services/v2/posts.service.ts
if (natsClient.isConnected() && post.contentId) {
  await natsClient.trackYourNewType(userId, contentId, postId);
}
```

---

## Monitoring

### Check Connection Status

```typescript
const connected = natsClient.isConnected();
console.log(`NATS connected: ${connected}`);
```

### Check Events Published

```bash
# NATS CLI
nats sub "user.interaction.*"
```

Expected output:
```
[#1] Received on "user.interaction.like"
{"user_id":"user123","content_id":"content456","interaction_type":"like","timestamp":"2025-11-25T10:30:00Z"}
```

### Monitor ML Service

```bash
# ML service interaction service logs
cd services/ml-service
python3 -m src.interest_graph.interaction_service
```

Expected logs:
```
Connected to NATS: nats://localhost:4222
Interaction service started, listening for events...
Processed like from user user123 on content content456 (weight=0.5)
```

---

## Troubleshooting

### NATS Not Connected

**Symptom:** No events tracked, logs show:
```
NATS not connected, skipping interaction event
```

**Solution:**
```bash
# 1. Check NATS is running
curl http://localhost:8222/varz

# 2. Start NATS if needed
docker run -d -p 4222:4222 -p 8222:8222 nats:latest

# 3. Verify NATS_URL in .env
NATS_URL=nats://localhost:4222

# 4. Restart core service
yarn dev:core
```

### Events Not Received by ML Service

**Check:**
1. ML service interaction service running?
   ```bash
   python3 -m src.interest_graph.interaction_service
   ```

2. Listening to correct subjects?
   ```python
   # Should subscribe to: user.interaction.*
   ```

3. NATS server same for both services?
   ```bash
   # Core: NATS_URL in .env
   # ML: NATS_URL in .env
   ```

### Post has no contentId

**Symptom:** Tracking not called, post created by user (not bot)

**Expected:** Only bot-created posts with contentId are tracked

**Check:**
```javascript
// MongoDB
db.posts.findOne({ _id: "post123" })
// Should have: contentId: "content456"
```

---

## Future Enhancements

### 1. Bulk Event Publishing

For high-volume scenarios:

```typescript
// Buffer events and publish in batches
const events: UserInteractionEvent[] = [];
events.push({ user_id, content_id, interaction_type, timestamp });

// Publish batch every 100 events or 5 seconds
if (events.length >= 100) {
  await natsClient.publishBatch(events);
}
```

### 2. Event Replay

Backfill missing interactions:

```typescript
// Query MongoDB for historical interactions
const interactions = await db.interactions.find({
  timestamp: { $gte: cutoffDate }
});

// Replay to NATS
for (const interaction of interactions) {
  await natsClient.publishUserInteraction(interaction);
}
```

### 3. Analytics Integration

Track interaction metrics:

```typescript
// Publish to both ML service and analytics
await Promise.all([
  natsClient.trackLike(userId, contentId, postId),
  analyticsClient.track('content_liked', { userId, contentId })
]);
```

---

## Summary

✅ **Implemented:** NATS integration in core service
✅ **Tracked:** View, Like interactions (with contentId)
✅ **Graceful:** Non-blocking, fire-and-forget
✅ **Robust:** Auto-reconnect, error handling
✅ **Extensible:** Easy to add new interaction types

**Status:** Production Ready
**Next:** Deploy and monitor interaction tracking
