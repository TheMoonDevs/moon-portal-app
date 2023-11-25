// write next.js api handler
import {MongooseUser} from '@/utils/services/models/User';
import { dbConnect } from '@/utils/services/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
//import { login } from '../../lib/auth';

type ResponseData = {
    users?: any[];
    error?: any;
    success?: boolean;
  }

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
    ) {
    const { username, password } = req.body;
    await dbConnect();
    switch (req.method) {
        case 'GET':
          try {
            const users = await MongooseUser.find({
            }).lean() /* find all the data in our database */
            //console.log(user);
            if(users)
            res.status(200).json({ success: true, users })
            else
            res.status(400).json({ success: false })
          } catch (error) {
            console.log(error);
            res.status(400).json({ success: false })
          }
          break
        default:
          res.status(400).json({ success: false })
          break
      }
}