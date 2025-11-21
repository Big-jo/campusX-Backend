import { UsersService } from '../services/v2/users.service';

export async function seedBots(): Promise<void> {
  try {
    console.log('Seeding bot accounts...');
    const usersService = new UsersService();
    // await usersService.seedBots();
    console.log('Bot account seeding completed');
  } catch (error) {
    console.error('Error seeding bot accounts:', error);
    throw error;
  }
}
