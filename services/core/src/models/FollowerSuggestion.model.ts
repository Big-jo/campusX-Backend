import mongoose, { Schema, Document } from 'mongoose';

export interface ISuggestionItem {
  userId: mongoose.Types.ObjectId;
  score: number;
  mutualCount: number;
  campus: string;
  reasons: string[];
  activityScore: number;
}

export interface IFollowerSuggestion extends Document {
  userId: mongoose.Types.ObjectId;
  suggestions: ISuggestionItem[];
  computedAt: Date;
  expiresAt: Date;
}

const SuggestionItemSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true },
  mutualCount: { type: Number, required: true },
  campus: { type: String, default: null },
  reasons: { type: [String], default: [] },
  activityScore: { type: Number, default: 0 },
}, { _id: false });

const FollowerSuggestionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  suggestions: { type: [SuggestionItemSchema], default: [] },
  computedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
}, {
  timestamps: true
});

// Indexes
FollowerSuggestionSchema.index({ userId: 1, expiresAt: 1 });
FollowerSuggestionSchema.index({ expiresAt: 1 }); // TTL cleanup

export default mongoose.model<IFollowerSuggestion>('FollowerSuggestion', FollowerSuggestionSchema);
