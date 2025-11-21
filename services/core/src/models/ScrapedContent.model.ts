import mongoose, { Schema, Document } from 'mongoose';

export interface IScrapedContentMetadata {
  author?: string;
  publishedAt?: Date;
  wordCount: number;
}

export interface IScrapedContent extends Document {
  url: string;
  title: string;
  content: string; // Markdown
  images: string[]; // GCS URLs
  keywords: string[];
  sourceDomain: string;
  interestCategory: string;
  scrapedAt: Date;
  qualityScore: number;
  status: 'pending' | 'posted' | 'rejected';
  usedByBots: mongoose.Types.ObjectId[];
  metadata: IScrapedContentMetadata;
}

const ScrapedContentMetadataSchema = new Schema({
  author: { type: String },
  publishedAt: { type: Date },
  wordCount: { type: Number, default: 0 }
}, { _id: false });

const ScrapedContentSchema: Schema = new Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  keywords: [{
    type: String
  }],
  sourceDomain: {
    type: String,
    required: true
  },
  interestCategory: {
    type: String,
    required: true,
    index: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  qualityScore: {
    type: Number,
    default: 0.0
  },
  status: {
    type: String,
    enum: ['pending', 'posted', 'rejected'],
    default: 'pending',
    index: true
  },
  usedByBots: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: {
    type: ScrapedContentMetadataSchema,
    default: () => ({})
  }
});

// Indexes for efficient queries
ScrapedContentSchema.index({ status: 1, interestCategory: 1 });
ScrapedContentSchema.index({ scrapedAt: -1 });

// Transform _id to id on JSON serialization
ScrapedContentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

ScrapedContentSchema.set('toObject', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<IScrapedContent>('ScrapedContent', ScrapedContentSchema);
