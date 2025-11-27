import { faker } from '@faker-js/faker';
import { firstNames, lastNames, departments, interests, campusSlang } from '../data/nigerian-names';
import campusData from '../../campus/data';
import type { IUserProfile } from '../../../interfaces/IUser';

export interface GeneratedUser {
  name: string;
  userTag: string;
  email: string;
  password: string;
  phone_number: string;
  userProfile: IUserProfile;
  resetToken: string;
  accountType: string;
  fcm_token?: string;
  interests: string[];
  userType: 'active' | 'moderate' | 'lurker';
  createdAt: Date;
}

/**
 * Generate realistic Nigerian university student profile
 */
export class UserGenerator {
  private usedUserTags = new Set<string>();
  private campuses = campusData.slice(0, 20); // Top 20 Nigerian universities

  constructor(seedValue?: number) {
    if (seedValue) {
      faker.seed(seedValue);
    }
  }

  private generateUserTag(firstName: string, lastName: string): string {
    let userTag = '';
    let attempts = 0;

    do {
      const variants = [
        `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}${faker.number.int({ min: 10, max: 99 })}`,
        `${firstName.toLowerCase()}_${faker.number.int({ min: 100, max: 999 })}`
      ];

      userTag = faker.helpers.arrayElement(variants);
      attempts++;
    } while (this.usedUserTags.has(userTag) && attempts < 10);

    this.usedUserTags.add(userTag);
    return userTag;
  }

  private assignUserType(): 'active' | 'moderate' | 'lurker' {
    // Power law distribution: 20% active, 30% moderate, 50% lurker
    const rand = Math.random();
    if (rand < 0.2) return 'active';
    if (rand < 0.5) return 'moderate';
    return 'lurker';
  }

  private generateBio(department: string, userInterests: string[]): string {
    const bioTemplates = [
      `${department} student | ${userInterests.slice(0, 2).join(' & ')} enthusiast | Living my best campus life 🎓`,
      `${department} major | ${userInterests[0]} lover | ${faker.helpers.arrayElement(campusSlang)} 💯`,
      `Studying ${department} | ${userInterests.slice(0, 2).join(', ')} | ${faker.company.catchPhrase()}`,
      `${department} | Future ${faker.person.jobTitle()} | ${userInterests[0]} addict`,
      `${department} student | ${userInterests.join(', ')} | Campus vibes only`,
    ];

    return faker.helpers.arrayElement(bioTemplates);
  }

  private generateAvatar(gender: string): string {
    // Nigerian-appropriate placeholder avatars
    const maleAvatars = [
      'https://i.pravatar.cc/150?img=12',
      'https://i.pravatar.cc/150?img=13',
      'https://i.pravatar.cc/150?img=14',
      'https://i.pravatar.cc/150?img=51',
      'https://i.pravatar.cc/150?img=52'
    ];

    const femaleAvatars = [
      'https://i.pravatar.cc/150?img=5',
      'https://i.pravatar.cc/150?img=9',
      'https://i.pravatar.cc/150?img=10',
      'https://i.pravatar.cc/150?img=44',
      'https://i.pravatar.cc/150?img=45'
    ];

    return gender === 'male'
      ? faker.helpers.arrayElement(maleAvatars)
      : faker.helpers.arrayElement(femaleAvatars);
  }

  generateUser(gender?: 'male' | 'female'): GeneratedUser {
    // Random gender if not specified
    const selectedGender = gender || faker.helpers.arrayElement(['male', 'female'] as const);

    // Generate Nigerian name using faker + Nigerian names
    const nigerianFirst = faker.helpers.arrayElement(firstNames[selectedGender]);
    const nigerianLast = faker.helpers.arrayElement(lastNames);

    // Sometimes use pure Nigerian name, sometimes mix with faker
    const usePureNigerian = Math.random() > 0.3; // 70% pure Nigerian names
    const firstName = usePureNigerian ? nigerianFirst : faker.person.firstName();
    const lastName = usePureNigerian ? nigerianLast : faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;

    // Select campus
    const campus = faker.helpers.arrayElement(this.campuses);
    const department = faker.helpers.arrayElement(departments);

    // Select interests (2-4 interests per user)
    const userInterests = faker.helpers.arrayElements(
      interests,
      faker.number.int({ min: 2, max: 4 })
    );

    // Generate userTag
    const userTag = this.generateUserTag(firstName, lastName);

    // Email - campus-specific
    const email = `${userTag}@${campus.acronym.toLowerCase()}.edu.ng`;

    // Phone number - Nigerian format
    const phoneNumber = faker.phone.number({ style: 'national' });

    // Bio
    const bio = this.generateBio(department, userInterests);

    // Avatar
    const avatar = this.generateAvatar(selectedGender);

    // User type (active/moderate/lurker)
    const userType = this.assignUserType();

    // Created date (spread over last 60 days)
    const createdAt = faker.date.recent({ days: 60 });

    // Build user profile matching IUserProfile
    const userProfile: IUserProfile = {
      avatar,
      university: campus.name,
      department,
      gender: selectedGender,
      rep_points: faker.number.int({ min: 0, max: 500 }), // Random rep points
      bio,
      lastSeen: createdAt
    };

    return {
      name: fullName,
      userTag,
      email,
      password: 'hashed_password_placeholder', // Will be hashed by model
      phone_number: phoneNumber,
      userProfile,
      resetToken: faker.string.uuid(),
      accountType: 'user',
      fcm_token: Math.random() > 0.5 ? faker.string.alphanumeric(152) : undefined,
      interests: userInterests,
      userType,
      createdAt
    };
  }

  /**
   * Generate multiple users with gender balance
   */
  generateUsers(count: number): GeneratedUser[] {
    const users: GeneratedUser[] = [];
    const maleCount = Math.floor(count * 0.55); // 55% male (typical Nigerian university ratio)
    const femaleCount = count - maleCount;

    // Generate male users
    for (let i = 0; i < maleCount; i++) {
      users.push(this.generateUser('male'));
    }

    // Generate female users
    for (let i = 0; i < femaleCount; i++) {
      users.push(this.generateUser('female'));
    }

    // Shuffle to mix genders
    return faker.helpers.shuffle(users);
  }
}

// Singleton instance
let generatorInstance: UserGenerator | null = null;

export function getUserGenerator(seed?: number): UserGenerator {
  if (!generatorInstance || seed !== undefined) {
    generatorInstance = new UserGenerator(seed);
  }
  return generatorInstance;
}
