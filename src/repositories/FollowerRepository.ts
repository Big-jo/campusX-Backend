import { BaseRepository } from './BaseRepository';
import FollowerModel, { IFollower } from '../models/Follower.model';
import mongoose from 'mongoose';

export class FollowerRepository extends BaseRepository<IFollower> {
  constructor() {
    super(FollowerModel);
  }

  /**
   * Get all followers for a user (people following the user)
   * @param userId - The target user ID
   * @returns Array of follower user IDs
   */
  async getFollowers(userId: string): Promise<string[]> {
    const followers = await this.find(
      { target: new mongoose.Types.ObjectId(userId) },
      { follower: 1, _id: 0 }
    );

    return followers.map(f => f.follower.toString());
  }

  /**
   * Get all users that a user is following
   * @param userId - The follower user ID
   * @returns Array of target user IDs
   */
  async getFollowings(userId: string): Promise<string[]> {
    const followings = await this.find(
      { follower: new mongoose.Types.ObjectId(userId) },
      { target: 1, _id: 0 }
    );

    return followings.map(f => f.target.toString());
  }

  /**
   * Check if a user is following another user
   * @param followerId - The follower user ID
   * @param targetId - The target user ID
   * @returns True if following, false otherwise
   */
  async isFollowing(followerId: string, targetId: string): Promise<boolean> {
    return this.exists({
      follower: new mongoose.Types.ObjectId(followerId),
      target: new mongoose.Types.ObjectId(targetId)
    });
  }

  /**
   * Get follower count for a user
   * @param userId - The user ID
   * @returns Number of followers
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.count({ target: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Get following count for a user
   * @param userId - The user ID
   * @returns Number of users being followed
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.count({ follower: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Create a follow relationship
   * @param followerId - The follower user ID
   * @param targetId - The target user ID
   * @returns The created follow document
   */
  async createFollow(followerId: string, targetId: string): Promise<IFollower> {
    return this.create({
      follower: new mongoose.Types.ObjectId(followerId),
      target: new mongoose.Types.ObjectId(targetId)
    } as any);
  }

  /**
   * Remove a follow relationship
   * @param followerId - The follower user ID
   * @param targetId - The target user ID
   * @returns The deleted follow document
   */
  async removeFollow(followerId: string, targetId: string): Promise<IFollower | null> {
    return this.deleteOne({
      follower: new mongoose.Types.ObjectId(followerId),
      target: new mongoose.Types.ObjectId(targetId)
    });
  }
}
