import InterestCategoryModel from '../models/Interest.model';
import interestData from '../seed/interests/data';

export async function seedInterests(): Promise<void> {
  try {
    const count = await InterestCategoryModel.countDocuments();

    if (count > 0) {
      console.log(`Interests already seeded (${count} records found). Skipping...`);
      return;
    }

    console.log('Seeding interests...');
    await InterestCategoryModel.insertMany(interestData);
    console.log(`Successfully seeded ${interestData.length} interest categories`);
  } catch (error) {
    console.error('Error seeding interests:', error);
    throw error;
  }
}
