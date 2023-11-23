// write next.js api handler
import User from '@/utils/services/models/User';
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
        case 'GET':
          try {
            const user = await User.findOne({
                username: username,
                password: password
            }) /* find all the data in our database */
            res.status(200).json({ success: true, user })
          } catch (error) {
            res.status(400).json({ success: false })
          }
          break
        case 'POST':
          try {
            const user = await User.create(
              req.body
            ) /* create a new model in the database */
            res.status(201).json({ success: true, user })
          } catch (error) {
            res.status(400).json({ success: false })
          }
          break
        default:
          res.status(400).json({ success: false })
          break
      }
}