import { InterestRepository } from '../../repositories/InterestRepository';
import { UserRepository } from '../../repositories/UserRepository';

export class UsersService {
  private interestRepository: InterestRepository;
  private userRepository: UserRepository;

  constructor() {
    this.interestRepository = new InterestRepository();
    this.userRepository = new UserRepository();
  }

  async getInterests() {
    const categories = await this.interestRepository.getAllCategories();

    return {
      data: {
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          emoji: cat.emoji,
          displayOrder: cat.displayOrder,
          topics: cat.topics
        }))
      },
      meta: {
        maxSelectableTopics: 3
      }
    };
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findByIdSecure(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      data: {
        id: user._id,
        name: user.name,
        userTag: user.userTag,
        email: user.email,
        userProfile: user.userProfile,
        fcm_token: user.fcm_token,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, profileData: any) {
    const updateData: any = {};

    // Map fields to userProfile nested structure
    if (profileData.name) updateData.name = profileData.name;
    if (profileData.bio !== undefined) updateData['userProfile.bio'] = profileData.bio;
    if (profileData.university !== undefined) updateData['userProfile.university'] = profileData.university;
    if (profileData.course !== undefined) updateData['userProfile.course'] = profileData.course;
    if (profileData.gender !== undefined) updateData['userProfile.gender'] = profileData.gender;
    if (profileData.level !== undefined) updateData['userProfile.level'] = profileData.level;
    if (profileData.phoneNumber !== undefined) updateData['userProfile.phoneNumber'] = profileData.phoneNumber;

    const updatedUser = await this.userRepository.updateProfile(userId, updateData);

    if (!updatedUser) {
      throw new Error('Failed to update user profile');
    }

    return {
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        userTag: updatedUser.userTag,
        email: updatedUser.email,
        userProfile: updatedUser.userProfile,
        updatedAt: updatedUser.updatedAt
      },
      message: 'Profile updated successfully'
    };
  }

  /**
   * Save user interests
   */
  async saveInterests(userId: string, topicIds: string[]) {
    // Validate that topic IDs exist
    const categories = await this.interestRepository.getAllCategories();
    const allTopicIds = categories.flatMap(cat => cat.topics.map(topic => topic.id));

    const invalidTopics = topicIds.filter(id => !allTopicIds.includes(id));
    if (invalidTopics.length > 0) {
      throw new Error(`Invalid topic IDs: ${invalidTopics.join(', ')}`);
    }

    const updatedUser = await this.userRepository.saveInterests(userId, topicIds);

    if (!updatedUser) {
      throw new Error('Failed to save interests');
    }

    return {
      data: {
        interests: updatedUser.userProfile.interests
      },
      message: 'Interests saved successfully'
    };
  }
}
