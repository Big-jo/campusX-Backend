import { seedCampuses } from './campus.seed';
import { seedInterests } from './interests.seed';
import { seedBots } from './bots.seed';

export async function runSeeds(): Promise<void> {
  console.log('Starting database seeding...');

  try {
    await seedCampuses();
    await seedInterests();
    await seedBots();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Database seeding failed:', error);
    throw error;
  }
}
