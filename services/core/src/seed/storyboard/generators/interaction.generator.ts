import { faker } from '@faker-js/faker';
import { sampleZipf, timeDecay, weightedSample } from '../utils/distributions';
import type { GeneratedPost } from './post.generator';

export interface GeneratedInteraction {
  userId: string;
  postId: string;
  type: 'like' | 'comment' | 'share' | 'view';
  comment?: string;
  createdAt: Date;
}

const commentTemplates = [
  // Agreement
  '💯', 'Facts!', 'This is it!', 'Exactly!', 'True talk',
  // Reactions
  '😂😂😂', '🔥🔥', 'Chai!', 'Omo', 'Abeg o', 'No be small',
  // Questions
  'Really?', 'Seriously?', 'Na wa o', 'How?', 'When?',
  // Support
  'We move!', 'You go dey alright', 'Keep it up', 'Proud of you',
  // Contextual
  'Same here!', 'I relate', 'This is me', 'Felt this',
  'Who else?', 'Tag someone', 'Drop the link', 'Send location',
  // Campus specific
  'Which campus?', 'What level?', 'Wetin happen?'
];

export class InteractionGenerator {
  constructor(private seed?: number) {
    if (seed) {
      faker.seed(seed);
    }
  }

  /**
   * Generate interactions for a post using Zipf distribution
   * Popular posts get exponentially more engagement
   */
  generatePostInteractions(
    post: GeneratedPost & { _id: string },
    allUserIds: string[],
    follows: Map<string, string[]>, // userId -> list of following
    postRank: number,
    totalPosts: number
  ): GeneratedInteraction[] {
    const interactions: GeneratedInteraction[] = [];

    // Calculate engagement based on Zipf distribution and time decay
    const ageInHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
    const baseEngagement = sampleZipf(totalPosts) === postRank ? 1.0 : 0.1;
    const timeMultiplier = timeDecay(ageInHours, 48); // 48-hour half-life
    const engagementProbability = baseEngagement * timeMultiplier;

    // Get potential engagers (followers + some random users)
    const followers = follows.get(post.userId) || [];
    const randomUsers = faker.helpers.arrayElements(
      allUserIds.filter(id => id !== post.userId),
      Math.min(20, allUserIds.length - 1)
    );

    const potentialEngagers = Array.from(
      new Set([...followers, ...randomUsers])
    );

    // Generate views (most interactions start as views)
    const viewCount = Math.floor(potentialEngagers.length * engagementProbability * 0.8);
    const viewers = faker.helpers.arrayElements(potentialEngagers, Math.min(viewCount, potentialEngagers.length));

    for (const userId of viewers) {
      interactions.push({
        userId,
        postId: post._id,
        type: 'view',
        createdAt: this.generateInteractionTime(post.createdAt)
      });
    }

    // Generate likes (10-15% of viewers like)
    const likeRate = faker.number.float({ min: 0.10, max: 0.15 });
    const likers = faker.helpers.arrayElements(
      viewers,
      Math.floor(viewers.length * likeRate)
    );

    for (const userId of likers) {
      interactions.push({
        userId,
        postId: post._id,
        type: 'like',
        createdAt: this.generateInteractionTime(post.createdAt)
      });
    }

    // Generate comments (20-30% of likers comment)
    const commentRate = faker.number.float({ min: 0.20, max: 0.30 });
    const commenters = faker.helpers.arrayElements(
      likers,
      Math.floor(likers.length * commentRate)
    );

    for (const userId of commenters) {
      interactions.push({
        userId,
        postId: post._id,
        type: 'comment',
        comment: faker.helpers.arrayElement(commentTemplates),
        createdAt: this.generateInteractionTime(post.createdAt)
      });
    }

    // Generate shares (5-10% of likers share)
    const shareRate = faker.number.float({ min: 0.05, max: 0.10 });
    const sharers = faker.helpers.arrayElements(
      likers,
      Math.floor(likers.length * shareRate)
    );

    for (const userId of sharers) {
      interactions.push({
        userId,
        postId: post._id,
        type: 'share',
        createdAt: this.generateInteractionTime(post.createdAt)
      });
    }

    return interactions;
  }

  /**
   * Generate realistic interaction timestamp
   * Interactions happen after post creation with decay over time
   */
  private generateInteractionTime(postCreatedAt: Date): Date {
    const postTime = postCreatedAt.getTime();
    const now = Date.now();

    // Interactions can only happen after post creation
    if (postTime > now) return new Date(postTime);

    // Exponential decay - most interactions happen soon after posting
    const maxAge = now - postTime;
    const lambda = 0.1; // Decay rate
    const randomAge = -Math.log(1 - Math.random()) / lambda;

    // Cap at maximum age
    const interactionAge = Math.min(randomAge * 3600 * 1000, maxAge); // Convert to ms

    return new Date(postTime + interactionAge);
  }

  /**
   * Generate batch interactions for all posts
   */
  generateAllInteractions(
    posts: Array<GeneratedPost & { _id: string }>,
    userIds: string[],
    follows: Map<string, string[]>
  ): GeneratedInteraction[] {
    const allInteractions: GeneratedInteraction[] = [];

    // Sort posts by engagement potential (mix of recency and randomness)
    const rankedPosts = posts
      .map(post => ({
        post,
        score: Math.random() * timeDecay(
          (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60),
          72
        )
      }))
      .sort((a, b) => b.score - a.score);

    // Generate interactions for each post
    for (let i = 0; i < rankedPosts.length; i++) {
      const { post } = rankedPosts[i];
      const interactions = this.generatePostInteractions(
        post,
        userIds,
        follows,
        i,
        posts.length
      );

      allInteractions.push(...interactions);
    }

    return allInteractions;
  }

  /**
   * Calculate interaction statistics
   */
  static calculateStats(interactions: GeneratedInteraction[]): {
    totalInteractions: number;
    byType: Record<string, number>;
    topPosts: Array<{ postId: string; count: number }>;
  } {
    const byType: Record<string, number> = {};
    const postCounts = new Map<string, number>();

    for (const interaction of interactions) {
      byType[interaction.type] = (byType[interaction.type] || 0) + 1;

      postCounts.set(
        interaction.postId,
        (postCounts.get(interaction.postId) || 0) + 1
      );
    }

    const topPosts = Array.from(postCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([postId, count]) => ({ postId, count }));

    return {
      totalInteractions: interactions.length,
      byType,
      topPosts
    };
  }
}

export function getInteractionGenerator(seed?: number): InteractionGenerator {
  return new InteractionGenerator(seed);
}
