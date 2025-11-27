/**
 * K6 Utility Functions
 * Reuses storyboard generators for consistent, realistic content
 */

import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const postCreationTime = new Trend('post_creation_duration');
export const feedLoadTime = new Trend('feed_load_duration');
export const interactionTime = new Trend('interaction_duration');
export const postsCreated = new Counter('posts_created');
export const interactionCount = new Counter('interactions_made');

/**
 * Make authenticated request
 */
export function authenticatedRequest(http, method, url, token, body = null, params = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const options = {
    headers,
    ...params
  };

  let response;
  if (body) {
    response = http[method](url, JSON.stringify(body), options);
  } else {
    response = http[method](url, null, options);
  }

  return response;
}

/**
 * Check response status and track errors
 */
export function checkResponse(response, expectedStatus = 200, checkName = 'request') {
  const success = check(response, {
    [`${checkName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${checkName}: response has body`]: (r) => r.body && r.body.length > 0
  });

  errorRate.add(!success);
  return success;
}

/**
 * Parse JSON safely
 */
export function parseJSON(response) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error('Failed to parse JSON:', response.body);
    return null;
  }
}

/**
 * Random sleep to simulate realistic user behavior
 */
export function randomSleep(min = 1, max = 3) {
  sleep(min + Math.random() * (max - min));
}

/**
 * Pick random element from array
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ============================================================================
// Nigerian Names & Context Data (from storyboard/data/nigerian-names.ts)
// ============================================================================

const nigerianFirstNames = {
  male: [
    'Adeola', 'Chukwuemeka', 'Ibrahim', 'Daniel', 'Oluwaseun',
    'Obiora', 'Musa', 'Emmanuel', 'Babatunde', 'Chidera',
    'Yusuf', 'Tunde', 'Ikechukwu', 'Ahmed', 'Michael',
    'Chinedu', 'Abubakar', 'Joseph', 'Emeka', 'Usman',
    'David', 'Obinna', 'Suleiman', 'Peter', 'Kelechi',
    'Hassan', 'Samuel', 'Uchenna', 'Aminu', 'Victor'
  ],
  female: [
    'Adunni', 'Chiamaka', 'Fatima', 'Grace', 'Ngozi',
    'Amina', 'Blessing', 'Nneka', 'Aisha', 'Chioma',
    'Zainab', 'Faith', 'Ifeoma', 'Hauwa', 'Joy',
    'Nkechi', 'Khadija', 'Mary', 'Chinenye', 'Maryam',
    'Esther', 'Adaeze', 'Halima', 'Deborah', 'Onyinye',
    'Ramatu', 'Victoria', 'Chidimma', 'Safiya', 'Patience'
  ]
};

const nigerianLastNames = [
  'Adeyemi', 'Okonkwo', 'Bello', 'Williams', 'Okeke',
  'Hassan', 'Johnson', 'Eze', 'Mohammed', 'Okafor',
  'Ibrahim', 'Adekunle', 'Chukwu', 'Musa', 'Nwankwo',
  'Suleiman', 'Olayemi', 'Ugwu', 'Abubakar', 'Adewale',
  'Nnamdi', 'Usman', 'Adeleke', 'Obi', 'Yusuf',
  'Oyedepo', 'Nnaji', 'Garba', 'Oluwole', 'Anyanwu',
  'Ahmad', 'Babatunde', 'Emeka', 'Aliyu', 'Chinedu',
  'Danjuma', 'Olaniyan', 'Ikenna', 'Sadiq', 'Onyeka'
];

const universities = [
  { name: 'University of Lagos', acronym: 'UNILAG' },
  { name: 'University of Ibadan', acronym: 'UI' },
  { name: 'Obafemi Awolowo University', acronym: 'OAU' },
  { name: 'University of Nigeria, Nsukka', acronym: 'UNN' },
  { name: 'Ahmadu Bello University', acronym: 'ABU' },
  { name: 'University of Benin', acronym: 'UNIBEN' },
  { name: 'University of Ilorin', acronym: 'UNILORIN' },
  { name: 'Lagos State University', acronym: 'LASU' }
];

const departments = [
  'Computer Science', 'Engineering', 'Medicine', 'Law',
  'Economics', 'Mass Communication', 'Business Administration',
  'Accounting', 'Political Science', 'Psychology',
  'English', 'Mathematics', 'Physics', 'Chemistry'
];

const interests = [
  'Tech', 'Football', 'Music', 'Fashion', 'Photography',
  'Reading', 'Gaming', 'Fitness', 'Cooking', 'Politics',
  'Art', 'Basketball', 'Debate', 'Entrepreneurship', 'Movies', 'Anime'
];

const campusSlang = [
  'gbese don enter my transcript',
  'ASUU strike loading',
  'mama put rice hit different',
  'hostel wahala',
  'carry over gang',
  'first class or nothing',
  'SUG elections coming',
  'no light since morning',
  'buka food is life',
  'campus vibes only'
];

// ============================================================================
// Post Templates (from storyboard/generators/post.generator.ts)
// ============================================================================

const postTemplates = {
  academic: [
    'Just finished my ${subject} assignment after ${hours} hours 😭',
    'Who else is writing ${subject} exam tomorrow? 📚',
    '${subject} lecturer just cancelled class, we move! 💃',
    'This ${subject} course is not for the weak minded 🤯',
    'Group study for ${subject} exam, who\'s down? 📖',
    'My ${subject} result just came out and... 😱',
    'Anyone else confused by today\'s ${subject} lecture? 🤔',
    'Downloaded ${subject} past questions, God when? 🙏',
    '${subject} practical was chaotic today 😂',
    'Studying ${subject} at 2am hits different 🌙'
  ],
  social: [
    '${event} was lit last night! 🔥',
    'SUG elections coming up, make we vote wisely o 🗳️',
    'Fellowship this Sunday, pull up! 🙏',
    'Inter-faculty sports next week, let\'s go! ⚽',
    'Cultural day was amazing! 💯',
    'Who else is going for ${event}? 🎉',
    'Campus party this weekend, details in bio 🎊',
    'Department week is here! 🎭',
    'Freshers welcome party incoming 🎈',
    'End of semester vibes hitting different 🎓'
  ],
  food: [
    'This ${location} ${food} hits different! 😋',
    'Mama put rice saved me today 🍚',
    'Cafeteria ${food} is actually good today 👌',
    'Who else is tired of ${food}? 😩',
    '${location} just increased their prices again 💸',
    'Best ${food} on campus, no cap 🧢',
    'Broke but hungry, the usual 😭',
    'Late night ${food} cravings 🌙',
    'This ${food} from ${location} is elite 👑',
    'Budget: 500 naira. Reality: 2000 naira on ${food} 💀'
  ],
  campus_life: [
    'ASUU strike rumors are back 🙄',
    'Hostel power went off again 😤',
    'No water since morning, this hostel though 💧',
    'Lectures at 7am should be illegal 😴',
    'Traffic to campus was mad today 🚗',
    'Library is packed, exam season is here 📚',
    'Hostel inspection tomorrow, panic mode! 😨',
    'This heat in lecture hall is not okay 🥵',
    'Shuttle broke down again 🚌',
    'Campus WiFi is doing nonsense today 📶'
  ],
  tech: [
    'Just finished building my ${tech_project} 💻',
    'Anyone into ${tech_topic}? Let\'s connect 🤝',
    'This new ${tech_item} is fire 🔥',
    'Debugging since morning, send help 🐛',
    'Learned ${tech_skill} today, progress! 📈',
    'Best ${tech_tool} for students? Drop recommendations 👇',
    'Tech meetup this weekend, who\'s coming? 💡',
    'Just deployed my first ${tech_project} 🚀',
    'Coding tutorial that helped me: ${tech_topic} ✨',
    'Looking for ${tech_skill} study partner 🧑‍💻'
  ],
  sports: [
    'Football match this evening, who dey? ⚽',
    'Our faculty won! 🏆',
    'Who else watched the ${team} match? 📺',
    'Inter-hall sports coming up 🏃',
    'Basketball court is free, pull up 🏀',
    'This ${team} performance though 😤',
    'Sports complex is finally open 🎾',
    'Morning jog gang, where you at? 🏃‍♀️',
    'Gym membership or nah? 💪',
    'We need more sports events on campus ⚡'
  ],
  motivation: [
    'New semester, new me 💯',
    'Grinding in silence 🤫',
    'First class or nothing! 📊',
    'Your only competition is who you were yesterday 🎯',
    'Small wins matter 🌟',
    'Trust the process 🙏',
    'Consistency is key 🔑',
    'Dream big, work hard ✨',
    'You didn\'t come this far to only come this far 💪',
    'Keep pushing, you got this! 🚀'
  ]
};

const commentTemplates = [
  // Reactions
  '😂😂😂', '🔥🔥', 'Chai!', 'Omo', 'Abeg o', 'No be small',
  // Agreement
  '💯', 'Facts!', 'This is it!', 'Exactly!', 'True talk',
  // Questions
  'Really?', 'Seriously?', 'Na wa o', 'How?', 'When?',
  // Support
  'We move!', 'You go dey alright', 'Keep it up', 'Proud of you',
  // Contextual
  'Same here!', 'I relate', 'This is me', 'Felt this',
  'Who else?', 'Tag someone', 'Drop the link', 'Send location',
  // Campus specific
  'Which campus?', 'What level?', 'Wetin happen?'
];

// ============================================================================
// Generator Functions (from storyboard generators)
// ============================================================================

/**
 * Generate Nigerian-style username
 */
export function generateUsername() {
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const first = randomElement(nigerianFirstNames[gender]);
  const last = randomElement(nigerianLastNames);
  const num = Math.floor(Math.random() * 100);

  const variants = [
    `${first.toLowerCase()}${last.toLowerCase()}`,
    `${first.toLowerCase()}_${last.toLowerCase()}`,
    `${first.toLowerCase()}.${last.toLowerCase()}`,
    `${first.toLowerCase()}${num}`,
    `${first.toLowerCase()}_${num}`
  ];

  return randomElement(variants);
}

/**
 * Generate Nigerian-style email
 */
export function generateEmail(username) {
  const university = randomElement(universities);
  return `${username}@${university.acronym.toLowerCase()}.edu.ng`;
}

/**
 * Generate random Nigerian campus post content
 * Uses actual storyboard templates for consistency
 */
export function generatePostContent() {
  // Pick random category
  const categories = Object.keys(postTemplates);
  const category = randomElement(categories);
  const templates = postTemplates[category];

  let content = randomElement(templates);

  // Fill in variables
  const hours = Math.floor(Math.random() * 8) + 2;
  const subjects = ['MTH101', 'CSC201', 'PHY102', 'CHM103', 'BIO201', 'ENG101', 'GST101'];
  const events = ['Fresher\'s Night', 'Matriculation', 'Convocation', 'Career Fair', 'Hackathon'];
  const locations = ['Mama Caro\'s spot', 'School gate', 'Cafeteria', 'Buka'];
  const foods = ['rice and stew', 'jollof rice', 'eba and soup', 'indomie', 'beans'];
  const techProjects = ['website', 'mobile app', 'portfolio', 'API', 'chatbot'];
  const techTopics = ['React', 'Python', 'Machine Learning', 'Web Dev', 'Data Science'];
  const techTools = ['VS Code', 'GitHub', 'Figma', 'Notion', 'Canva'];
  const techSkills = ['JavaScript', 'UI/UX', 'Backend', 'Frontend', 'DevOps'];
  const teams = ['Arsenal', 'Chelsea', 'Man United', 'Barcelona', 'Real Madrid'];

  content = content.replace('${hours}', hours);
  content = content.replace('${subject}', randomElement(subjects));
  content = content.replace('${event}', randomElement(events));
  content = content.replace('${location}', randomElement(locations));
  content = content.replace('${food}', randomElement(foods));
  content = content.replace('${tech_project}', randomElement(techProjects));
  content = content.replace('${tech_topic}', randomElement(techTopics));
  content = content.replace('${tech_item}', randomElement(techTools));
  content = content.replace('${tech_tool}', randomElement(techTools));
  content = content.replace('${tech_skill}', randomElement(techSkills));
  content = content.replace('${team}', randomElement(teams));

  return content;
}

/**
 * Generate random hashtags based on categories
 */
export function generateHashtags() {
  const hashtagSets = [
    ['StudentLife', 'Campus', 'Nigeria'],
    ['ExamPrep', 'Study', 'FirstClass'],
    ['TechTwitter', 'CodeNewbie', 'Developer'],
    ['NigerianStudents', 'UniLife', 'Campus'],
    ['Motivation', 'GrindMode', 'Success'],
    ['Football', 'Sports', 'Fitness'],
    ['FoodLover', 'NigerianFood', 'Campus']
  ];

  return randomElement(hashtagSets);
}

/**
 * Generate random comment using actual storyboard templates
 */
export function generateComment() {
  return randomElement(commentTemplates);
}

/**
 * Get weighted random action (simulates realistic user behavior)
 * Based on storyboard interaction generator distributions
 */
export function getWeightedAction() {
  const rand = Math.random();

  // 60% view only
  if (rand < 0.6) return 'view';
  // 25% like (10-15% of viewers)
  if (rand < 0.85) return 'like';
  // 10% comment (20-30% of likers)
  if (rand < 0.95) return 'comment';
  // 5% share (5-10% of likers)
  return 'share';
}

/**
 * Generate user profile data
 */
export function generateUserProfile() {
  const gender = Math.random() > 0.55 ? 'male' : 'female'; // 55% male like storyboard
  const firstName = randomElement(nigerianFirstNames[gender]);
  const lastName = randomElement(nigerianLastNames);
  const username = generateUsername();
  const university = randomElement(universities);
  const department = randomElement(departments);
  const userInterests = [];

  // 2-4 interests per user
  const interestCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < interestCount; i++) {
    const interest = randomElement(interests);
    if (!userInterests.includes(interest)) {
      userInterests.push(interest);
    }
  }

  const bioTemplates = [
    `${department} student | ${userInterests.slice(0, 2).join(' & ')} enthusiast | Living my best campus life 🎓`,
    `${department} major | ${userInterests[0]} lover | ${randomElement(campusSlang)} 💯`,
    `Studying ${department} | ${userInterests.slice(0, 2).join(', ')} | Future leader`,
    `${department} | ${userInterests.join(', ')} | Campus vibes only`
  ];

  return {
    name: `${firstName} ${lastName}`,
    username,
    email: generateEmail(username),
    phoneNumber: `+234${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    university: university.name,
    department,
    gender,
    interests: userInterests,
    bio: randomElement(bioTemplates)
  };
}

/**
 * Setup test summary
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2)
  };
}
