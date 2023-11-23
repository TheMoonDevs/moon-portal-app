import mongoose from 'mongoose'

export interface Surveys extends mongoose.Document {
  name: string
  username: string
  password: string
}

/* SurveySchema will correspond to a collection in your MongoDB database. */
const SurveySchema = new mongoose.Schema<Surveys>({
  username: {
    /* The name of this pet */

    type: String,
    required: [true, 'Please provide a name for this pet.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  password: {
    /* The name of this pet */

    type: String,
    required: [true, 'Please provide a name for this pet.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  name: {
    type: String,
  },
})

export default mongoose.models.User || mongoose.model<Surveys>('Survey', SurveySchema)