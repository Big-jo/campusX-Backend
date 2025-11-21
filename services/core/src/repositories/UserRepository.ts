import { BaseRepository } from './BaseRepository';
import UserModel from '../models/User.model';
import { IUser } from '../interfaces/IUser';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return this.findOne({ email });
  }

  /**
   * Find user by userTag
   */
  async findByUserTag(userTag: string) {
    return this.findOne({ userTag });
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: Partial<IUser>) {
    return this.updateById(userId, { $set: profileData });
  }

  /**
   * Find user by ID without password and reset token
   */
  async findByIdSecure(userId: string) {
    return this.findById(userId, { password: 0, resetToken: 0 });
  }

  /**
   * Search users by name or userTag
   */
  async searchUsers(query: string, limit: number = 20) {
    const regex = new RegExp(query, 'i');
    return this.find(
      {
        $or: [
          { name: regex },
          { userTag: regex }
        ]
      },
      { password: 0, resetToken: 0 },
      { limit, sort: { name: 1 } }
    );
  }

  /**
   * Save user interests (topic IDs)
   */
  async saveInterests(userId: string, topicIds: string[]) {
    return this.updateById(userId, { $set: { 'userProfile.interests': topicIds } });
  }
}
