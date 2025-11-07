import CampusModel from '../models/Campus.model';
import campusData from '../seed/campus/data';

export async function seedCampuses(): Promise<void> {
  try {
    const count = await CampusModel.countDocuments();

    if (count > 0) {
      console.log(`Campuses already seeded (${count} records found). Skipping...`);
      return;
    }

    console.log('Seeding campuses...');
    await CampusModel.insertMany(campusData);
    console.log(`Successfully seeded ${campusData.length} campuses`);
  } catch (error) {
    console.error('Error seeding campuses:', error);
    throw error;
  }
}
