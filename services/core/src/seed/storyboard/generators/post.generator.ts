import { faker } from '@faker-js/faker';
import { campusSlang } from '../data/nigerian-names';
import { getActivityMultiplier, poissonSample } from '../utils/distributions';

export interface GeneratedPost {
  userId: string;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  hashtags: string[];
  createdAt: Date;
}

const postTemplates = {
  // Academic
  academic: [
    'Just finished my ${subject} assignment after ${hours} hours 😭',
    'This ${subject} test was something else! Who else wrote it? 🤔',
    'Study group for ${subject} exam, who\'s in? 📚',
    'Finally understood ${topic} after watching ${resource} 🎉',
    'Prof ${name} cancelled class again 🙌',
    'Anyone get the ${assignment} question 3? I\'m stuck',
    'Exam timetable just dropped 📅 Good luck everyone!',
    'Library full on a ${day}? Exam stress is real',
  ],

  // Social
  social: [
    '${event} was lit last night! 🔥',
    'SUG election drama continues... ${opinion}',
    'Fellowship this evening, who\'s coming? 🙏',
    'Hostel ${number} ${complaint}',
    'Made new friends at ${location} today ❤️',
    'Campus gossip: ${gossip}',
    'Throwback to ${event} ${emoji}',
  ],

  // Food
  food: [
    'This ${location} ${food} hits different! 😋',
    'Who else is tired of ${food}? ',
    'Best ${food} spot on campus? Drop recommendations 👇',
    '2am and I\'m making indomie again 🍜',
    'Mama put rice + fried plantain = heaven 🍛',
    '${cafeteria} serving ${food} again today 🙄',
  ],

  // General Campus Life
  campus: [
    'ASUU ${action} again ${emoji}',
    'No light since yesterday 😤',
    'Water don finish for hostel again',
    'This shuttle wahala is too much',
    'Registration stress is real! Anyone else having issues?',
    'Who else is ${activity} this weekend?',
    'Campus vibes >>> ${emoji}',
  ],

  // Tech/Trending
  tech: [
    'Just discovered ${app}! Game changer 🚀',
    'Who\'s watching ${show} on ${platform}?',
    'New ${artist} song on repeat 🎵',
    '${game} players where you at? 🎮',
    'This ${technology} tutorial is 🔥',
  ],

  // Sports
  sports: [
    '${team} won! Who else watched? ⚽',
    'Football match at ${field} this evening',
    'Inter-faculty sports next week 🏃',
    '${player} is the GOAT, argue with your keyboard',
  ],

  // Motivation/Quotes
  motivation: [
    'Stay focused, we\'re almost there 💪',
    'Hard work pays off! ${achievement}',
    'God\'s timing is perfect ⏰',
    'Your only limit is you 🌟',
    'Keep grinding, success is coming 📈',
  ]
};

const hashtags = {
  academic: ['StudentLife', 'ExamPrep', 'StudyMode', 'CampusLife'],
  social: ['NaijaStudent', 'CampusVibes', 'UnilifeNigeria'],
  food: ['FoodieLife', 'NaijaFood', 'CampusFood'],
  general: ['Nigeria', 'Campus', 'StudentLife', 'Naija'],
  trending: ['Trending', 'Viral', 'MustWatch']
};

export class PostGenerator {
  constructor(private seed?: number) {
    if (seed) {
      faker.seed(seed);
    }
  }

  private fillTemplate(template: string): string {
    const replacements: { [key: string]: () => string } = {
      subject: () => faker.helpers.arrayElement([
        'GST', 'Mathematics', 'Physics', 'Chemistry', 'English',
        'Programming', 'Economics', 'Statistics'
      ]),
      hours: () => String(faker.number.int({ min: 2, max: 8 })),
      topic: () => faker.helpers.arrayElement([
        'integration', 'organic chemistry', 'algorithms', 'recursion',
        'thermodynamics', 'supply and demand'
      ]),
      resource: () => faker.helpers.arrayElement([
        'YouTube', 'Khan Academy', 'the textbook', 'a tutorial'
      ]),
      name: () => faker.person.lastName(),
      assignment: () => faker.helpers.arrayElement([
        'calculus', 'physics', 'programming', 'essay'
      ]),
      day: () => faker.date.weekday(),
      event: () => faker.helpers.arrayElement([
        'SUG night', 'Faculty week', 'Concert', 'Party', 'Hangout'
      ]),
      opinion: () => faker.helpers.arrayElement([
        'this is getting too much', 'make we just vote finish',
        'these politicians sef'
      ]),
      location: () => faker.helpers.arrayElement([
        'the cafeteria', 'library', 'auditorium', 'faculty'
      ]),
      complaint: () => faker.helpers.arrayElement([
        'no light again', 'water palaver', 'noise too much'
      ]),
      number: () => String(faker.number.int({ min: 1, max: 10 })),
      gossip: () => '...',
      emoji: () => faker.helpers.arrayElement(['😂', '🔥', '💯', '🙌', '😭', '🎉']),
      food: () => faker.helpers.arrayElement([
        'jollof rice', 'fried rice', 'beans', 'yam', 'plantain',
        'amala', 'eba', 'spaghetti', 'rice and stew'
      ]),
      cafeteria: () => faker.helpers.arrayElement([
        'Main cafeteria', 'Faculty caf', 'Hostel kitchen'
      ]),
      action: () => faker.helpers.arrayElement([
        'strike loading', 'meeting called', 'negotiation ongoing'
      ]),
      activity: () => faker.helpers.arrayElement([
        'reading', 'chilling', 'going out', 'resting'
      ]),
      app: () => faker.helpers.arrayElement([
        'this new app', 'ChatGPT', 'this productivity tool'
      ]),
      show: () => faker.helpers.arrayElement([
        'Money Heist', 'Game of Thrones', 'Breaking Bad', 'Squid Game'
      ]),
      platform: () => faker.helpers.arrayElement(['Netflix', 'Prime', 'YouTube']),
      artist: () => faker.helpers.arrayElement([
        'Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Asake'
      ]),
      game: () => faker.helpers.arrayElement(['FIFA', 'COD', 'PUBG', 'Fortnite']),
      technology: () => faker.helpers.arrayElement([
        'Python', 'JavaScript', 'React', 'AI', 'ML'
      ]),
      team: () => faker.helpers.arrayElement([
        'Arsenal', 'Man United', 'Chelsea', 'Liverpool', 'Real Madrid'
      ]),
      field: () => faker.helpers.arrayElement([
        'sports complex', 'faculty field', 'main field'
      ]),
      player: () => faker.helpers.arrayElement([
        'Messi', 'Ronaldo', 'Mbappe', 'Haaland'
      ]),
      achievement: () => faker.helpers.arrayElement([
        'Got an A!', 'Finished the project', 'Passed the test'
      ])
    };

    let result = template;
    for (const [key, generator] of Object.entries(replacements)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      result = result.replace(regex, generator());
    }

    return result;
  }

  generatePost(userId: string, userType: 'active' | 'moderate' | 'lurker'): GeneratedPost {
    // Select category
    const categories = Object.keys(postTemplates);
    const category = faker.helpers.arrayElement(categories) as keyof typeof postTemplates;

    // Select and fill template
    const template = faker.helpers.arrayElement(postTemplates[category]);
    let content = this.fillTemplate(template);

    // Occasionally add campus slang
    if (Math.random() < 0.2) {
      content += ` ${faker.helpers.arrayElement(campusSlang)}`;
    }

    // Add hashtags
    const relevantHashtags = hashtags[category as keyof typeof hashtags] || hashtags.general;
    const selectedHashtags = faker.helpers.arrayElements(
      relevantHashtags,
      faker.number.int({ min: 0, max: 3 })
    );

    // Generate media (20% of posts have media)
    let media: GeneratedPost['media'];
    if (Math.random() < 0.2) {
      media = [{
        type: faker.helpers.arrayElement(['image', 'video'] as const),
        url: faker.image.url()
      }];
    }

    // Generate realistic timestamp
    const createdAt = this.generateTimestamp(userType);

    return {
      userId,
      content,
      media,
      hashtags: selectedHashtags,
      createdAt
    };
  }

  private generateTimestamp(userType: string): Date {
    // Recent 30 days
    const daysAgo = faker.number.int({ min: 0, max: 30 });
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Set realistic hour based on activity patterns
    const hour = this.generateActivityHour(userType);
    date.setHours(hour);
    date.setMinutes(faker.number.int({ min: 0, max: 59 }));

    return date;
  }

  private generateActivityHour(userType: string): number {
    const weights = Array.from({ length: 24 }, (_, hour) =>
      getActivityMultiplier(hour)
    );

    // Adjust for user type
    if (userType === 'lurker') {
      // Lurkers post during off-peak hours
      for (let i = 18; i <= 23; i++) weights[i] *= 0.5;
    }

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let hour = 0; hour < 24; hour++) {
      random -= weights[hour];
      if (random <= 0) return hour;
    }

    return 12; // Default fallback
  }

  /**
   * Generate multiple posts for a user based on their type
   */
  generateUserPosts(
    userId: string,
    userType: 'active' | 'moderate' | 'lurker'
  ): GeneratedPost[] {
    // Post count based on user type (power law distribution)
    const postCounts = {
      active: () => faker.number.int({ min: 8, max: 15 }),
      moderate: () => faker.number.int({ min: 3, max: 7 }),
      lurker: () => faker.number.int({ min: 0, max: 2 })
    };

    const count = postCounts[userType]();
    const posts: GeneratedPost[] = [];

    for (let i = 0; i < count; i++) {
      posts.push(this.generatePost(userId, userType));
    }

    // Sort by date
    return posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export function getPostGenerator(seed?: number): PostGenerator {
  return new PostGenerator(seed);
}
