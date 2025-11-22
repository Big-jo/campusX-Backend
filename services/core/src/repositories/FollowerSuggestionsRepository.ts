import { BaseRepository } from './BaseRepository';
import FollowerSuggestionModel, { IFollowerSuggestion, ISuggestionItem } from '../models/FollowerSuggestion.model';
import mongoose from 'mongoose';

export class FollowerSuggestionsRepository extends BaseRepository<IFollowerSuggestion> {
  constructor() {
    super(FollowerSuggestionModel);
  }

  /**
   * Get suggestions for a user with pagination
   */
  async getSuggestions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ suggestions: ISuggestionItem[]; total: number; computedAt: Date | null }> {
    const record = await this.findOne({ userId: mongoose.Types.ObjectId(userId) } as any);

    if (!record || !record.suggestions) {
      return { suggestions: [], total: 0, computedAt: null };
    }

    // Check if expired
    if (record.expiresAt < new Date()) {
      return { suggestions: [], total: 0, computedAt: null };
    }

    const total = record.suggestions.length;
    const paginatedSuggestions = record.suggestions.slice(offset, offset + limit);

    return {
      suggestions: paginatedSuggestions,
      total,
      computedAt: record.computedAt,
    };
  }

  /**
   * Save or update suggestions for a user
   */
  async saveSuggestions(
    userId: string,
    suggestions: ISuggestionItem[],
    ttlMinutes: number = 15
  ): Promise<IFollowerSuggestion> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    const updated = await this.updateOne(
      { userId: mongoose.Types.ObjectId(userId) } as any,
      {
        $set: {
          suggestions,
          computedAt: now,
          expiresAt,
        },
      },
      { upsert: true }
    );

    if (!updated) {
      throw new Error('Failed to save suggestions');
    }

    return updated;
  }

  /**
   * Delete suggestions for a user
   */
  async deleteSuggestions(userId: string): Promise<boolean> {
    const result = await this.deleteOne({ userId: mongoose.Types.ObjectId(userId) } as any);
    return !!result;
  }

  /**
   * Delete expired suggestions (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
    return result.deletedCount || 0;
  }

  /**
   * Check if suggestions exist and are not expired
   */
  async hasValidSuggestions(userId: string): Promise<boolean> {
    const count = await this.count({
      userId: mongoose.Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    } as any);
    return count > 0;
  }
}
