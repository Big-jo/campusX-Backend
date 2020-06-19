import mongoose, {Schema, Document, mongo} from 'mongoose';

export interface ICampus extends Document {
   name: string;
   abbreviation: string;
  //  members: number;
}

const CampusSchema: Schema = new Schema({
  name: {type: String},
  abbreviation: {type: String},
  // members: {type: Number, default: 0},
});

export default mongoose.model<ICampus>('Campus', CampusSchema);
