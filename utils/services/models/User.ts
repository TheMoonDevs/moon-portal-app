import mongoose from 'mongoose'

export interface User {
  name: string
  username: string
  password: string
  email: string
  avatar: string
  usertype: string
  createdAt: Date
  updatedAt: Date
  role: string
  vertical: string
  industry: string
  status: string
  isAdmin: boolean
  timezone: string
  country: string
  workData: any
}

export interface DbUser extends User {
  _id: string 
}

export interface Users extends  User, mongoose.Document {
  
}


export enum USERTYPE {
  MEMBER = 'member',
  CLIENT = 'client',
}

export enum USERSTATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

export enum USERROLE {
  CORETEAM = 'coreteam',
  ASSOCIATE = 'associate',
  FREELANCER = 'freelancer',
  INTERN = 'intern',
}

export enum USERVERTICAL {
  DEV = 'dev',
  DESIGN = 'design',
  MARKETING = 'marketing',
  COMMUNITY = 'community',
  FINANCE = 'finance',
  LEGAL = 'legal',
  HR = 'hr',
  OPERATIONS = 'operations',
}

export enum USERINDUSTRY {
  CRYPTO = 'crypto',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  RETAIL = 'retail',
  REALSTATE = 'realstate',
  GAMING = 'gaming',
  SOCIAL = 'social',
  OTHERS = 'others',
}


export enum OVERLAPTYPE {
  ALLDAYS = 'alldays',
  WEEKDAYS = 'weekdays',
  WEEKENDS = 'weekends',
}

/* UserSchema will correspond to a collection in your MongoDB database. */
const UserSchema = new mongoose.Schema<Users>({
  username: {
    /* The name of this pet */

    type: String,
    required: [true, 'Please provide a name for this pet.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  password: {
    /* The name of this pet */

    type: String,
    required: [true, 'Please provide a password for this user.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  email: {
    type: String,
  },
  name: {
    type: String,
  },
  avatar: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  usertype: {
    type: String,
    default: USERTYPE.MEMBER,
  },
  role: {
    type: String,
    default: USERROLE.CORETEAM,
  },
  vertical: {
    type: String,
    default: USERVERTICAL.DEV,
  },
  status: {
    type: String,
    default: USERSTATUS.ACTIVE,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  timezone: {
    type: String,
  },
  country: {
    type: String,
  },
  workData: {
    type: Object,
  },
})

if (process.env.NODE_ENV === 'development' && mongoose.models && mongoose.models['User']) {
	mongoose.connection.models['User'].schema = UserSchema;
}

export const MongooseUser = mongoose.models?.User || mongoose.model<Users>('User', UserSchema)