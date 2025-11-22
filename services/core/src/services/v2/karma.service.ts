import mongoose from 'mongoose';
import User from '../../models/User.model';

/**
 * KarmaService - Centralized karma points management
 * Reddit-style system: +1 for post creation, +1 for comment, +1 for like received, -1 for downvote received
 */
export class KarmaService {
  /**
   * Award karma for creating a new post
   */
  async awardPostCreation(userId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'userProfile.rep_points': 1 } }
    );
  }

  /**
   * Award karma for creating a new comment
   */
  async awardCommentCreation(userId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      userId,
      { $inc: { 'userProfile.rep_points': 1 } }
    );
  }

  /**
   * Award karma when user's content receives a like
   */
  async awardLikeReceived(authorId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      authorId,
      { $inc: { 'userProfile.rep_points': 1 } }
    );
  }

  /**
   * Remove karma when like is removed from user's content
   */
  async removeLikeReceived(authorId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      authorId,
      { $inc: { 'userProfile.rep_points': -1 } }
    );
  }

  /**
   * Deduct karma when user's content receives a downvote
   */
  async awardDownvote(authorId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      authorId,
      { $inc: { 'userProfile.rep_points': -1 } }
    );
  }

  /**
   * Restore karma when downvote is removed from user's content
   */
  async removeDownvote(authorId: string | mongoose.Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(
      authorId,
      { $inc: { 'userProfile.rep_points': 1 } }
    );
  }
}
