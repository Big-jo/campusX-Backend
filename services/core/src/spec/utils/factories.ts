/**
 * Test Data Factories
 * Generate test data for users, posts, circles, etc.
 */
import faker from "faker";
import mongoose from "mongoose";
import { IUser, IPost } from "../../interfaces";
import { User } from "../../entities/User";
import { Post } from "../../entities/Post";
import UserModel from "../../models/User.model";
import PostModel from "../../models/Post.model";
import CircleModel from "../../models/Circle.model";

/**
 * Generate user data (without saving to DB)
 */
export function generateUserData(overrides?: Partial<IUser>): IUser {
  return {
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    userTag: faker.internet.userName().toLowerCase(),
    email: faker.internet.email().toLowerCase(),
    password: "test123",
    phone_number: faker.phone.phoneNumber(),
    fcm_token: "",
    resetToken: "",
    userProfile: {
      bio: faker.lorem.sentence(10),
      gender: faker.random.arrayElement(["male", "female", "other"]),
      university: faker.company.companyName(),
      department: faker.commerce.department(),
      avatar: "https://picsum.photos/200/300",
      lastSeen: new Date(),
    },
    ...overrides,
  } as IUser;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides?: Partial<IUser>) {
  const userData = generateUserData(overrides);
  const result = await User.CreateUser(userData);

  // Check if user creation was successful
  if ('exists' in result || !result.user) {
    throw new Error('User creation failed: ' + (result.err_message || 'Unknown error'));
  }

  return {
    ...result,
    userID: result.user.userID,
    token: result.token,
  };
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number): Promise<any[]> {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await createTestUser());
  }
  return users;
}

/**
 * Get a random user from the database
 */
export async function getRandomUser() {
  const users = await UserModel.find().exec();
  if (users.length === 0) {
    throw new Error("No users in database");
  }
  return users[Math.floor(Math.random() * users.length)];
}

/**
 * Get the first N users from the database
 */
export async function getTestUsers(limit: number = 1) {
  return await UserModel.find().limit(limit).exec();
}

/**
 * Generate post data (without saving to DB)
 */
export function generatePostData(authorId: string, overrides?: Partial<IPost>): IPost {
  return {
    author: authorId,
    text: faker.lorem.sentences(2),
    campus: faker.company.companyName(),
    parentPost: "",
    hashTags: [],
    mentions: [],
    ...overrides,
  } as IPost;
}

/**
 * Create a test post in the database
 */
export async function createTestPost(authorId: string, overrides?: Partial<IPost>) {
  const postData = generatePostData(authorId, overrides);
  const result = await Post.CreatePost(postData);
  return result;
}

/**
 * Create multiple test posts
 */
export async function createTestPosts(authorId: string, count: number): Promise<any[]> {
  const posts = [];
  for (let i = 0; i < count; i++) {
    posts.push(await createTestPost(authorId));
  }
  return posts;
}

/**
 * Get posts from the database
 */
export async function getTestPosts(limit?: number) {
  const query = PostModel.find().sort({ _id: -1 });
  if (limit) {
    query.limit(limit);
  }
  return await query.lean().exec();
}

/**
 * Generate circle data (without saving to DB)
 */
export function generateCircleData(creatorId: string, overrides?: any) {
  return {
    name: faker.lorem.words(2),
    description: faker.lorem.sentence(),
    university: faker.company.companyName(),
    isPrivate: faker.random.boolean(),
    creatorID: creatorId,
    ...overrides,
  };
}

/**
 * Create a test circle in the database
 */
export async function createTestCircle(creatorId: string, overrides?: any) {
  const circleData = generateCircleData(creatorId, overrides);
  // Assuming Circle entity exists and has a CreateCircle method
  // If not, we'll need to create directly via model
  const circle = await CircleModel.create(circleData);
  return circle;
}

/**
 * Generate comment data
 */
export function generateCommentData(authorId: string, postId: string, overrides?: any) {
  return {
    author: authorId,
    text: faker.lorem.sentence(),
    post: postId,
    ...overrides,
  };
}

/**
 * Clear all test data from database
 */
export async function clearAllTestData() {
  await UserModel.deleteMany({});
  await PostModel.deleteMany({});
  await CircleModel.deleteMany({});
  // Add other models as needed
}

/**
 * Create a complete test scenario with users and posts
 */
export async function createTestScenario(options: {
  userCount?: number;
  postsPerUser?: number;
} = {}) {
  const { userCount = 2, postsPerUser = 2 } = options;

  const users = await createTestUsers(userCount);
  const posts = [];

  for (const user of users) {
    const userPosts = await createTestPosts(user.userID, postsPerUser);
    posts.push(...userPosts);
  }

  return { users, posts };
}

/**
 * Generate a valid MongoDB ObjectId
 */
export function generateObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

/**
 * Convert string to ObjectId
 */
export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}
