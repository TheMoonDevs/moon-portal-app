// write next.js api handler
import {MongooseUser} from '@/utils/services/models/User';
import { dbConnect } from '@/utils/services/mongoose';
import { NextApiRequest, NextApiResponse } from 'next';
//import { login } from '../../lib/auth';

type ResponseData = {
    users?: any[];
    user?: any;
    error?: any;
    success?: boolean;
  }

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseData>
    ) {
    const user_in = JSON.parse(req.body);
    const _id = user_in._id?.toString();
    delete user_in._id;
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
        case 'POST':
            try {
                //console.log(req.body)
                const user = await new MongooseUser()
                Object.assign(user, user_in);
                //user.workData = user_in.workData;
                console.log(user);
                await user.save();
                 /* create a new model in the database */
                res.status(201).json({ success: true, user: user })
              } catch (error) {
                console.log(error);
                res.status(400).json({ success: false })
              }
              break
        case 'PUT':
            try {
                const user = await MongooseUser.findOneAndUpdate(
                    { _id: _id },
                    user_in,
                    { new: true, runValidators: true }
                  ) /* create a new model in the database */
                res.status(201).json({ success: true, user: user })
              } catch (error) {
                res.status(400).json({ success: false })
              }
              break
        default:
          res.status(400).json({ success: false })
          break
      }
}