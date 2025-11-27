import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from '../../models/User.model';
import Post from '../../models/Post.model';
import Follower from '../../models/Follower.model';
import { getUserGenerator } from './generators/user.generator';
import { getPostGenerator } from './generators/post.generator';
import { getInteractionGenerator } from './generators/interaction.generator';
import {
  generateSmallWorldNetwork,
  addInfluencers,
  addCampusClustering,
  calculateNetworkStats,
  type FollowRelationship
} from './utils/social-graph';

config();

interface SeedOptions {
  userCount?: number;
  fresh?: boolean;
  seed?: number;
}

/**
 * Main storyboard seeding script
 * Creates realistic social platform activity with Nigerian university context
 */
async function seedStoryboard(options: SeedOptions = {}) {
  const {
    userCount = 60,
    fresh = false,
    seed
  } = options;

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data if fresh flag is set
    if (fresh) {
      console.log('🗑️  Clearing existing storyboard data...');
      await User.deleteMany({ accountType: { $ne: 'bot' }, email: { $ne: "jovienloba1@gmail.com" } });
      await Post.deleteMany({  });
      await Follower.deleteMany({});
      console.log('✅ Data cleared\n');
    }

    console.log('=' .repeat(60));
    console.log('STORYBOARD SEED - Nigerian University Social Platform');
    console.log('='.repeat(60));
    console.log(`Target: ${userCount} users\n`);

    // Phase 1: Generate Users
    console.log('📝 Phase 1: Generating Users');
    console.log('-'.repeat(60));

    const userGenerator = getUserGenerator(seed);
    const generatedUsers = userGenerator.generateUsers(userCount);

    console.log(`Generated ${generatedUsers.length} user profiles`);
    console.log(`  - Active users: ${generatedUsers.filter(u => u.userType === 'active').length}`);
    console.log(`  - Moderate users: ${generatedUsers.filter(u => u.userType === 'moderate').length}`);
    console.log(`  - Lurkers: ${generatedUsers.filter(u => u.userType === 'lurker').length}\n`);

    // Save users to database
    const savedUsers = await User.insertMany(
      generatedUsers.map(user => ({
        ...user,
        password: 'hashed_password_placeholder', // Will be hashed by model
        resetToken: 'reset-token-placeholder',
        accountType: 'user'
      }))
    );

    console.log(`✅ Saved ${savedUsers.length} users to database\n`);

    const userIds = savedUsers.map(u => u._id.toString());
    const userMap = new Map(savedUsers.map(u => [u._id.toString(), u]));

    // Phase 2: Generate Follow Graph
    console.log('🔗 Phase 2: Generating Follow Graph');
    console.log('-'.repeat(60));

    // Generate small-world network
    let follows = generateSmallWorldNetwork(userIds, 12, 0.3);
    console.log(`Generated small-world network: ${follows.length} follows`);

    // Add influencers
    const influencerCount = Math.floor(userCount * 0.1); // 10% influencers
    const influencerFollows = addInfluencers(userIds, influencerCount, follows);
    follows = [...follows, ...influencerFollows];
    console.log(`Added ${influencerCount} influencers: +${influencerFollows.length} follows`);

    // Add campus-based clustering
    const campusGroups = new Map<string, string[]>();
    for (const [userId, user] of userMap) {
      const campus = user.userProfile.university;
      if (!campusGroups.has(campus)) {
        campusGroups.set(campus, []);
      }
      campusGroups.get(campus)!.push(userId);
    }

    const campusFollows = addCampusClustering(campusGroups);
    follows = [...follows, ...campusFollows];
    console.log(`Added campus clustering: +${campusFollows.length} follows\n`);

    // Save follows to database
    const savedFollows = await Follower.insertMany(
      follows.map(f => ({
        follower: f.followerId,
        target: f.followingId
      }))
    );

    console.log(`✅ Saved ${savedFollows.length} follow relationships\n`);

    // Calculate and display network stats
    const networkStats = calculateNetworkStats(userIds, follows);
    console.log('📊 Network Statistics:');
    console.log(`  - Total follows: ${networkStats.totalFollows}`);
    console.log(`  - Avg follows/user: ${networkStats.avgFollows.toFixed(2)}`);
    console.log(`  - Mutual follows: ${networkStats.mutualFollows}`);
    console.log('\n  Top Influencers:');
    for (const { userId, followers } of networkStats.topInfluencers.slice(0, 5)) {
      const user = userMap.get(userId);
      console.log(`    - ${user?.name}: ${followers} followers`);
    }
    console.log('');

    // Phase 3: Generate Posts
    console.log('📱 Phase 3: Generating Posts');
    console.log('-'.repeat(60));

    const postGenerator = getPostGenerator(seed);
    const allPosts: any[] = [];

    let activePosts = 0, moderatePosts = 0, lurkerPosts = 0;

    for (const user of savedUsers) {
      const userId = user._id.toString();
      const userType = generatedUsers.find(u => u.userTag === user.userTag)?.userType || 'moderate';

      const userPosts = postGenerator.generateUserPosts(userId, userType);

      for (const post of userPosts) {
        // Extract image URLs from media array
        const imageUrls = post.media
          ?.filter(m => m.type === 'image')
          .map(m => m.url) || [];

        const videoUrls = post.media
          ?.filter(m => m.type === 'video')
          .map(m => m.url) || [];

        allPosts.push({
          author: user._id,
          text: post.content,
          images: imageUrls,
          videos: videoUrls,
          hashTags: post.hashtags,
          createdAt: Date.now(),
          campus: user.userProfile.university,
          likes: 0,
          comments: 0,
          dislikes: 0
        });
      }

      if (userType === 'active') activePosts += userPosts.length;
      else if (userType === 'moderate') moderatePosts += userPosts.length;
      else lurkerPosts += userPosts.length;
    }

    const savedPosts = await Post.insertMany(allPosts);

    console.log(`Generated ${savedPosts.length} posts`);
    console.log(`  - From active users: ${activePosts}`);
    console.log(`  - From moderate users: ${moderatePosts}`);
    console.log(`  - From lurkers: ${lurkerPosts}\n`);

    console.log(`✅ Saved ${savedPosts.length} posts to database\n`);

    // Phase 4: Generate Interactions
    console.log('❤️  Phase 4: Generating Interactions');
    console.log('-'.repeat(60));

    const interactionGenerator = getInteractionGenerator(seed);

    // Build follows map for interaction generation
    const followsMap = new Map<string, string[]>();
    for (const follow of savedFollows) {
      const followerId = follow.follower.toString();
      if (!followsMap.has(followerId)) {
        followsMap.set(followerId, []);
      }
      followsMap.get(followerId)!.push(follow.target.toString());
    }

    // Generate interactions
    const postsWithIds = savedPosts.map(p => ({
      ...p.toObject(),
      _id: p._id.toString(),
      userId: p.author.toString(),
      content: p.text,
      createdAt: new Date(p.createdAt)
    }));

    const interactions = interactionGenerator.generateAllInteractions(
      postsWithIds,
      userIds,
      followsMap
    );

    console.log(`Generated ${interactions.length} interactions\n`);

    // Update post counts based on interactions
    const postLikeCounts = new Map<string, number>();
    const postCommentCounts = new Map<string, number>();
    const postShareCounts = new Map<string, number>();

    for (const interaction of interactions) {
      if (interaction.type === 'like') {
        postLikeCounts.set(
          interaction.postId,
          (postLikeCounts.get(interaction.postId) || 0) + 1
        );
      } else if (interaction.type === 'comment') {
        postCommentCounts.set(
          interaction.postId,
          (postCommentCounts.get(interaction.postId) || 0) + 1
        );
      } else if (interaction.type === 'share') {
        postShareCounts.set(
          interaction.postId,
          (postShareCounts.get(interaction.postId) || 0) + 1
        );
      }
    }

    // Batch update posts
    const bulkOps = [];
    for (const [postId, count] of postLikeCounts) {
      bulkOps.push({
        updateOne: {
          filter: { _id: postId },
          update: { $set: { likes: count } }
        }
      });
    }

    for (const [postId, count] of postCommentCounts) {
      bulkOps.push({
        updateOne: {
          filter: { _id: postId },
          update: { $set: { comments: count } }
        }
      });
    }

    for (const [postId, count] of postShareCounts) {
      bulkOps.push({
        updateOne: {
          filter: { _id: postId },
          update: { $inc: { likes: count } } // Add shares to likes as there's no shares field
        }
      });
    }

    if (bulkOps.length > 0) {
      await Post.bulkWrite(bulkOps);
    }

    // Calculate interaction stats
    const interactionStats = getInteractionGenerator().constructor.calculateStats(interactions);
    console.log('📊 Interaction Statistics:');
    console.log(`  - Total: ${interactionStats.totalInteractions}`);
    console.log(`  - Views: ${interactionStats.byType.view || 0}`);
    console.log(`  - Likes: ${interactionStats.byType.like || 0}`);
    console.log(`  - Comments: ${interactionStats.byType.comment || 0}`);
    console.log(`  - Shares: ${interactionStats.byType.share || 0}`);
    console.log('\n  Top Engaged Posts:');
    for (const { postId, count } of interactionStats.topPosts.slice(0, 5)) {
      const post = savedPosts.find(p => p._id.toString() === postId);
      const content = (post?.text || 'Unknown').substring(0, 50);
      console.log(`    - "${content}...": ${count} interactions`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ STORYBOARD SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  👥 Users: ${savedUsers.length}`);
    console.log(`  🔗 Follows: ${savedFollows.length}`);
    console.log(`  📱 Posts: ${savedPosts.length}`);
    console.log(`  ❤️  Interactions: ${interactionStats.totalInteractions}`);
    console.log('');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    fresh: args.includes('--fresh'),
    userCount: 60
  };

  // Parse user count
  const countArg = args.find(arg => arg.startsWith('--count='));
  if (countArg) {
    options.userCount = parseInt(countArg.split('=')[1], 10);
  }

  // Parse seed
  const seedArg = args.find(arg => arg.startsWith('--seed='));
  if (seedArg) {
    options.seed = parseInt(seedArg.split('=')[1], 10);
  }

  seedStoryboard(options)
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding error:', error);
      process.exit(1);
    });
}

export default seedStoryboard;
