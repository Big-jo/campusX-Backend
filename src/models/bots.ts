import mongoose, { Schema } from 'mongoose';
import { IUser } from 'src/interfaces/IUser';
import mongoosePaginate from 'mongoose-paginate';
import { BotType, botTypes } from 'src/types/types';

const BotSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  botType: {
    type: String,
    enum: botTypes,
    required: true
  },
  config: {
    postingFrequency: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'hourly' },
    maxPostsPerDay: { type: Number, default: 10 },
    autoPostEnabled: { type: Boolean, default: true },
    dataSources: [{ type: String }],
    keywords: [{ type: String }],
    hashtags: [{ type: String }]
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active'
  },
  stats: {
    totalPosts: { type: Number, default: 0 },
    totalInteractions: { type: Number, default: 0 },
    lastPostAt: { type: Date }
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.password;
      delete ret.resetToken;
      return ret;
    }
  },
  toObject: {
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});
BotSchema.plugin(mongoosePaginate);

export default mongoose.model('Bot', BotSchema);
