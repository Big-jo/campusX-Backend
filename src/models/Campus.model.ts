import mongoose, {Schema, Document, mongo} from 'mongoose';

interface ICampus extends Document {
   Name: string;
}

const CampusSchema: Schema = new Schema({
  Name: {type: String},
  Abbreviation: {type: String},
});

export default mongoose.model<ICampus>('Campus', CampusSchema);
