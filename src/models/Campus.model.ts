import mongoose, {Schema, Document} from 'mongoose';

export interface ICampus extends Document {
  name: string;
  acronym: string;
  motto?: string;
  web?: string;
  logo?: string;
  enabled: boolean;
}

const CampusSchema: Schema = new Schema({
  name: {type: String, required: true},
  acronym: {type: String, required: true},
  motto: {type: String, default: null},
  web: {type: String, default: null},
  logo: {type: String, default: null},
  enabled: {type: Boolean, default: false},
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

CampusSchema.index({name: 1, acronym: 1});

export default mongoose.model<ICampus>('Campus', CampusSchema);
