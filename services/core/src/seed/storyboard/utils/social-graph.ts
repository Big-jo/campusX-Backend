import { shuffle } from './distributions';

export interface FollowRelationship {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

/**
 * Generate small-world network (Watts-Strogatz model)
 * Mimics real social networks with clustering and short path lengths
 *
 * @param userIds - Array of user IDs
 * @param k - Average connections per user (default: 12)
 * @param beta - Rewiring probability (default: 0.3)
 */
export function generateSmallWorldNetwork(
  userIds: string[],
  k: number = 12,
  beta: number = 0.3
): FollowRelationship[] {
  const n = userIds.length;
  const follows: FollowRelationship[] = [];
  const connections = new Set<string>();

  // Step 1: Create ring lattice (each user connects to k/2 nearest neighbors on each side)
  const kHalf = Math.floor(k / 2);

  for (let i = 0; i < n; i++) {
    for (let j = 1; j <= kHalf; j++) {
      const target = (i + j) % n;

      // Add both directions for some edges (mutual follows)
      const isMutual = Math.random() < 0.4; // 40% mutual follow rate

      const edge1 = `${i}-${target}`;
      if (!connections.has(edge1)) {
        follows.push({
          followerId: userIds[i],
          followingId: userIds[target],
          createdAt: randomDate(30)
        });
        connections.add(edge1);
      }

      if (isMutual) {
        const edge2 = `${target}-${i}`;
        if (!connections.has(edge2)) {
          follows.push({
            followerId: userIds[target],
            followingId: userIds[i],
            createdAt: randomDate(30)
          });
          connections.add(edge2);
        }
      }
    }
  }

  // Step 2: Rewire edges with probability beta (creates "shortcuts")
  const edgesToRewire = Array.from(connections);

  for (const edge of edgesToRewire) {
    if (Math.random() < beta) {
      const [source, _] = edge.split('-').map(Number);

      // Find new random target
      let newTarget: number;
      let attempts = 0;
      do {
        newTarget = Math.floor(Math.random() * n);
        attempts++;
      } while (
        (newTarget === source || connections.has(`${source}-${newTarget}`)) &&
        attempts < 10
      );

      if (attempts < 10) {
        follows.push({
          followerId: userIds[source],
          followingId: userIds[newTarget],
          createdAt: randomDate(30)
        });
        connections.add(`${source}-${newTarget}`);
      }
    }
  }

  return follows;
}

/**
 * Add influencers with preferential attachment
 * Some users get many more followers (scale-free property)
 *
 * @param userIds - Array of user IDs
 * @param influencerCount - Number of influencers to create
 * @param existingFollows - Existing follow relationships
 */
export function addInfluencers(
  userIds: string[],
  influencerCount: number,
  existingFollows: FollowRelationship[]
): FollowRelationship[] {
  const newFollows: FollowRelationship[] = [];

  // Select random users to be influencers
  const influencers = shuffle(userIds).slice(0, influencerCount);

  // Calculate current follower counts
  const followerCounts = new Map<string, number>();
  for (const user of userIds) {
    followerCounts.set(user, 0);
  }

  for (const follow of existingFollows) {
    const count = followerCounts.get(follow.followingId) || 0;
    followerCounts.set(follow.followingId, count + 1);
  }

  // Add extra followers to influencers
  for (const influencer of influencers) {
    const extraFollowers = Math.floor(Math.random() * 20) + 15; // 15-35 extra followers

    // Preferentially attach: users with fewer connections more likely to follow influencer
    const potentialFollowers = userIds.filter(id => id !== influencer);

    const selectedFollowers = shuffle(potentialFollowers).slice(0, extraFollowers);

    for (const follower of selectedFollowers) {
      // Check if relationship already exists
      const exists = existingFollows.some(
        f => f.followerId === follower && f.followingId === influencer
      );

      if (!exists) {
        newFollows.push({
          followerId: follower,
          followingId: influencer,
          createdAt: randomDate(20)
        });
      }
    }
  }

  return newFollows;
}

/**
 * Add campus-based clustering
 * Users from same campus more likely to follow each other
 *
 * @param userIds - Array of user IDs
 * @param campusGroups - Map of campus -> user IDs
 */
export function addCampusClustering(
  campusGroups: Map<string, string[]>
): FollowRelationship[] {
  const follows: FollowRelationship[] = [];

  for (const [campus, users] of campusGroups) {
    if (users.length < 2) continue;

    // 30% of users follow someone from same campus
    const activeUsers = shuffle(users).slice(0, Math.floor(users.length * 0.3));

    for (const user of activeUsers) {
      // Follow 1-3 people from same campus
      const followCount = Math.floor(Math.random() * 3) + 1;
      const targets = shuffle(users.filter(u => u !== user)).slice(0, followCount);

      for (const target of targets) {
        follows.push({
          followerId: user,
          followingId: target,
          createdAt: randomDate(40)
        });
      }
    }
  }

  return follows;
}

/**
 * Generate random date within last N days
 */
function randomDate(maxDaysAgo: number): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);

  // Add random time
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));

  return date;
}

/**
 * Calculate network statistics
 */
export function calculateNetworkStats(
  userIds: string[],
  follows: FollowRelationship[]
): {
  totalUsers: number;
  totalFollows: number;
  avgFollows: number;
  mutualFollows: number;
  topInfluencers: Array<{ userId: string; followers: number }>;
} {
  const followerCounts = new Map<string, number>();
  const followingCounts = new Map<string, number>();

  for (const user of userIds) {
    followerCounts.set(user, 0);
    followingCounts.set(user, 0);
  }

  for (const follow of follows) {
    followerCounts.set(
      follow.followingId,
      (followerCounts.get(follow.followingId) || 0) + 1
    );
    followingCounts.set(
      follow.followerId,
      (followingCounts.get(follow.followerId) || 0) + 1
    );
  }

  // Count mutual follows
  const followSet = new Set(
    follows.map(f => `${f.followerId}-${f.followingId}`)
  );
  let mutualCount = 0;

  for (const follow of follows) {
    if (followSet.has(`${follow.followingId}-${follow.followerId}`)) {
      mutualCount++;
    }
  }

  // Top influencers
  const influencers = Array.from(followerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, followers]) => ({ userId, followers }));

  return {
    totalUsers: userIds.length,
    totalFollows: follows.length,
    avgFollows: follows.length / userIds.length,
    mutualFollows: mutualCount / 2, // Divide by 2 since counted twice
    topInfluencers: influencers
  };
}
