// write next.js api handler
import {MongooseUser} from '@/utils/services/models/User';
import { dbConnect } from '@/utils/services/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
//import { login } from '../../lib/auth';

type ResponseData = {
    user?: any;
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
        case 'POST':
          try {
            const user = await MongooseUser.findOne({
                username: username,
                password: password
            }) /* find all the data in our database */
            //console.log(user);
            if(user)
            res.status(200).json({ success: true, user })
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