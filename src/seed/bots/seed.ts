import mongoose from 'mongoose';
import User from '../../models/User.model';
import Bot from '../../models/bots';
import botConfigs from './data';
import { config } from 'dotenv';

config();

/**
 * Seed bot users and bot configurations
 * Creates 10 bots (one per interest category)
 */
async function seedBots() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/campusx';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing bots (optional - be careful in production!)
    const deleteExisting = process.argv.includes('--fresh');
    if (deleteExisting) {
      await User.deleteMany({ accountType: 'bot' });
      await Bot.deleteMany({});
      console.log('Cleared existing bots');
    }

    let created = 0;
    let skipped = 0;

    for (const botConfig of botConfigs) {
      // Check if bot already exists
      const existingUser = await User.findOne({ username: botConfig.username });
      if (existingUser) {
        console.log(`⏭️  Skipped: ${botConfig.username} (already exists)`);
        skipped++;
        continue;
      }

      // Create bot user account
      const user = await User.create({
        username: botConfig.username,
        name: botConfig.displayName,
        bio: botConfig.bio,
        email: `${botConfig.username}@campusx-bots.com`, // System email
        campus: 'global', // Global campus for bots
        accountType: 'bot', //TODO: Add type to interface 
        botMetadata: {
          botType: botConfig.categoryId,
          createdBy: 'system',
          version: '1.0'
        },
        verified: true
      });

      // Create bot configuration
      await Bot.create({
        user_id: user._id,
        botType: botConfig.interestCategory,
        config: botConfig.config,
        status: 'active',
        stats: {
          totalPosts: 0,
          totalInteractions: 0,
          lastPostAt: null
        }
      });

      console.log(`✅ Created: ${botConfig.displayName} (${botConfig.username})`);
      created++;
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created} bots`);
    console.log(`   ⏭️  Skipped: ${skipped} bots`);
    console.log(`   📦 Total: ${botConfigs.length} bot configs`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedBots()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding error:', error);
      process.exit(1);
    });
}

export default seedBots;
