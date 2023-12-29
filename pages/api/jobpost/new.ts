import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/utils/services/mongoose";
import JobPost from "@/utils/services/models/JobPost";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const session = await getServerSession(req, res, authOptions);

  // if (!session) {
  //   res.status(401).json({ success: false });
  //   return;
  // }

  await dbConnect();

  if (method === "POST") {
    try {
      //   console.log(req.body);
      const newJobPost = new JobPost(req.body);
      //   console.log(newJobPost);
      const savedJobPost = await newJobPost.save();

      res.status(201).json({ success: true, data: savedJobPost });
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false });
    }
  } else {
    res.status(400).json({ success: false });
  }
}
