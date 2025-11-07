import mongoose, {Schema, Document} from 'mongoose';

export interface ITopic {
  id: string;
  name: string;
  category_id: string;
}

export interface IInterestCategory extends Document {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  displayOrder: number;
  topics: ITopic[];
}

const TopicSchema = new Schema({
  id: {type: String, required: true},
  name: {type: String, required: true},
  category_id: {type: String, required: true}
}, {_id: false});

const InterestCategorySchema: Schema = new Schema({
  id: {type: String, required: true, unique: true},
  name: {type: String, required: true},
  icon: {type: String, required: true},
  emoji: {type: String, required: true},
  displayOrder: {type: Number, required: true},
  topics: [TopicSchema]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  }
});

InterestCategorySchema.index({id: 1, displayOrder: 1});

export default mongoose.model<IInterestCategory>('InterestCategory', InterestCategorySchema);
