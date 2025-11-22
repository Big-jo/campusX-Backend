# Follower Suggestions Specification

## Overview
Graph-based follower recommendation system that suggests users based on social connections, campus proximity, and user engagement. Expands user network progressively from same-campus to cross-campus connections.

## Algorithm (MVP - Phase 1)

### Scoring Formula
```
suggestion_score = (0.4 × FOF_score) + (0.3 × campus_score) + (0.3 × activity_score)
```

### Components

#### 1. Friends-of-Friends (40%)
- Find users followed by people you follow (2nd-degree connections)
- Score based on mutual connection count
```javascript
FOF_score = mutual_followers_count / max_mutual_count
```

#### 2. Campus Proximity (30%)
- Same campus: `campus_score = 1.0`
- Cross-campus (via FOF): `campus_score = 0.5`
- Different campus (no connection): `campus_score = 0.0`

#### 3. Activity × Reputation (30%)
- Combines user engagement with reputation
```javascript
recency_score = 1 / (1 + days_since_lastSeen / 30)  // Decay over 30 days
activity_score = (recency_score × rep_points) / max_rep_points
```

**Dual purpose:**
- Boosts active, high-reputation users in suggestions
- Prioritizes fresher suggestions for inactive users (re-engagement)

### Filters
- Exclude: already following, self, bot accounts (unless relevant)
- Min `rep_points`: 0 (no filter initially)
- Max age of suggestions: 15 mins (job refresh rate)

---

## Data Models

### FollowerSuggestion Collection
```typescript
{
  userId: ObjectId,              // User receiving suggestions
  suggestions: [
    {
      userId: ObjectId,          // Suggested user
      score: Number,             // Combined score (0-1)
      mutualCount: Number,       // # mutual followers
      campus: String,            // Suggested user's campus
      reasons: [String],         // ["mutual_followers", "same_campus"]
      activityScore: Number,     // lastSeen × rep_points component
    }
  ],
  computedAt: Date,
  expiresAt: Date,               // computedAt + 15 mins
}
```

**Indexes:**
```javascript
{ userId: 1, expiresAt: 1 }    // Fetch + TTL cleanup
{ expiresAt: 1 }               // TTL index
```

### Redis Cache
```
Key: suggestions:{userId}
Type: Sorted Set
Members: userId:score pairs (top 20)
TTL: 15 mins
```

### Required User Model Fields
- `userProfile.lastSeen` (Date) - existing
- `userProfile.rep_points` (Number) - existing
- `userProfile.university` (String) - existing
- `userProfile.followers` (Number) - existing
- `userProfile.followings` (Number) - existing

### New Indexes Needed
```javascript
// Follower.model.ts
{ follower: 1, target: 1 }     // Unique constraint (existing)
{ target: 1 }                  // Reverse lookups

// User.model.ts (check if exist, add if needed)
{ 'userProfile.university': 1 }
{ 'userProfile.rep_points': -1 }
{ 'userProfile.lastSeen': -1 }
```

---

## API Design

### Endpoint
```
GET /api/v2/users/suggestions
```

### Query Parameters
- `limit` (default: 20, max: 50)
- `offset` (default: 0)
- `refresh` (boolean, force recompute)

### Response
```json
{
  "success": true,
  "data": [
    {
      "user": {
        "_id": "...",
        "name": "...",
        "userTag": "...",
        "userProfile": {
          "avatar": "...",
          "university": "...",
          "rep_points": 150,
          "followers": 45
        }
      },
      "score": 0.85,
      "mutualFollowers": 5,
      "reasons": ["mutual_followers", "same_campus"],
      "activityScore": 0.72
    }
  ],
  "meta": {
    "total": 120,
    "limit": 20,
    "offset": 0,
    "computedAt": "2025-11-22T10:30:00Z"
  }
}
```

---

## Implementation Plan

### Files to Create

#### 1. Model
```
services/core/src/models/FollowerSuggestion.model.ts
```

#### 2. Repository
```
services/core/src/repositories/FollowerSuggestionsRepository.ts
```
Methods:
- `getSuggestions(userId, limit, offset)`
- `saveSuggestions(userId, suggestions)`
- `deleteSuggestions(userId)`

#### 3. Service
```
services/core/src/services/v2/follower-suggestions.service.ts
```
Methods:
- `getUserSuggestions(userId, limit, offset, refresh)`
- `computeSuggestionsForUser(userId)` - core algorithm
- `batchComputeSuggestions(userIds)` - for job

#### 4. Job
```
services/core/src/jobs/follower-suggestions.job.ts
```
- Runs every 15 mins via BullMQ
- Processes users in batches (e.g., 100 users/batch)
- Prioritizes inactive users (older `lastSeen`)
- Updates Redis + MongoDB

#### 5. Route
```
services/core/src/routes/v2/users.route.ts
```
Add: `GET /suggestions` to existing users routes

### Algorithm Implementation (Pseudocode)

```typescript
async computeSuggestionsForUser(userId: string) {
  // 1. Get user's followings
  const followings = await FollowerRepo.getFollowings(userId);

  // 2. Friends-of-Friends aggregation
  const fofCandidates = await db.follows.aggregate([
    { $match: { follower: { $in: followings } } },
    { $match: { target: { $ne: userId, $nin: followings } } },
    { $group: { _id: "$target", mutualCount: { $sum: 1 } } },
    { $sort: { mutualCount: -1 } },
    { $limit: 500 }  // Pre-filter top candidates
  ]);

  // 3. Enrich with user data (campus, rep_points, lastSeen)
  const candidates = await User.find({
    _id: { $in: fofCandidates.map(c => c._id) },
    accountType: 'user'  // Exclude bots
  });

  // 4. Score each candidate
  const userCampus = await User.findById(userId).select('userProfile.university');
  const maxMutual = Math.max(...fofCandidates.map(c => c.mutualCount));
  const maxRepPoints = Math.max(...candidates.map(c => c.userProfile.rep_points));

  const scored = candidates.map(candidate => {
    const fof = fofCandidates.find(f => f._id.equals(candidate._id));

    // FOF score
    const fofScore = fof.mutualCount / maxMutual;

    // Campus score
    const campusScore = candidate.userProfile.university === userCampus ? 1.0 : 0.5;

    // Activity score
    const daysSinceActive = (Date.now() - candidate.userProfile.lastSeen) / (1000*60*60*24);
    const recencyScore = 1 / (1 + daysSinceActive / 30);
    const activityScore = (recencyScore * candidate.userProfile.rep_points) / maxRepPoints;

    // Combined score
    const score = (0.4 * fofScore) + (0.3 * campusScore) + (0.3 * activityScore);

    return {
      userId: candidate._id,
      score,
      mutualCount: fof.mutualCount,
      campus: candidate.userProfile.university,
      activityScore,
      reasons: [
        'mutual_followers',
        campusScore === 1.0 ? 'same_campus' : 'connected_campus'
      ]
    };
  });

  // 5. Sort and store top 50
  const topSuggestions = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  // 6. Save to MongoDB
  await FollowerSuggestionsRepo.saveSuggestions(userId, topSuggestions);

  // 7. Cache top 20 in Redis
  await redis.zadd(
    `suggestions:${userId}`,
    ...topSuggestions.slice(0, 20).flatMap(s => [s.score, s.userId])
  );
  await redis.expire(`suggestions:${userId}`, 900);  // 15 mins

  return topSuggestions;
}
```

### Job Implementation

```typescript
// jobs/follower-suggestions.job.ts
export async function followerSuggestionsJob() {
  // 1. Find users to update (prioritize inactive users)
  const users = await User.find({
    accountType: 'user',
    'userProfile.followers': { $gte: 1 }  // Only users with followers
  })
  .sort({ 'userProfile.lastSeen': 1 })  // Oldest first (re-engagement)
  .limit(1000)  // Process 1k users per run
  .select('_id');

  // 2. Process in batches
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(
      batch.map(user =>
        FollowerSuggestionsService.computeSuggestionsForUser(user._id)
      )
    );
  }
}
```

### BullMQ Setup

```typescript
// worker.ts updates
import { followerSuggestionsJob } from './jobs/follower-suggestions.job';

// Add to worker
worker.on('follower-suggestions', async (job) => {
  await followerSuggestionsJob();
});

// Schedule in cron (every 15 mins)
await cronQueue.add('follower-suggestions', {}, {
  repeat: { pattern: '*/15 * * * *' }
});
```

---

## Performance Considerations

### Query Optimization
- Index on `{ follower: 1, target: 1 }` critical for FOF lookups
- Limit FOF candidates to 500 before enrichment
- Use projection to fetch only needed user fields

### Caching Strategy
- Redis: top 20 for instant reads (<1ms)
- MongoDB: full list (50) for pagination
- Fallback: if Redis miss, read from MongoDB

### Scaling
- **<100k users**: Current approach works
- **>100k users**: Batch job may take >15 mins
  - Solution: Incremental updates (only changed users)
  - Or: Reduce frequency to 30 mins
- **>500k users**: Consider Neo4j migration for graph traversal

---

## Monitoring & Metrics

### Track
- Suggestion computation time per user
- Job execution time (should be <15 mins)
- Cache hit rate (Redis vs MongoDB)
- Click-through rate (CTR) on suggestions
- Follow conversion rate (follows from suggestions / total follows)

### Alerts
- Job execution time >15 mins
- Cache hit rate <80%
- Suggestions older than 30 mins for active users

---

## Future Phases

### Phase 2: Interest-Based Scoring (Post Semantic Analysis)
Add weight component:
```
interest_score = jaccard_similarity(user_interests, candidate_interests)
Updated formula: 0.3×FOF + 0.2×campus + 0.2×activity + 0.3×interest
```

Requires:
- Post processing pipeline (parse post content)
- Semantic analysis (extract topics/tags)
- Update `userProfile.interests` based on post interactions

### Phase 3: Engagement Signals
Track additional signals:
- Post views from non-followers
- Profile visits
- Comment/like interactions
- Message frequency

Adjust weights based on engagement affinity.

### Phase 4: ML-Based Ranking
- Train ranking model on follow/unfollow events
- Features: all current signals + historical patterns
- Personalized weight learning per user

---

## Testing Strategy

### Unit Tests
- Scoring algorithm accuracy
- Edge cases: no followings, isolated users, new users

### Integration Tests
- FOF aggregation correctness
- Redis/MongoDB sync
- API response format

### Load Tests
- 1k concurrent suggestion requests
- Job execution with 100k users
- Redis cache performance

---

## Rollout Plan

1. **Development**: Implement service + job
2. **Testing**: Test with 1k users subset
3. **Staging**: Run job once, validate suggestions quality
4. **Production**:
   - Enable job with 15-min schedule
   - Monitor for 48h
   - Gradual rollout to 100% users
5. **Iterate**: Adjust weights based on CTR/conversion metrics
