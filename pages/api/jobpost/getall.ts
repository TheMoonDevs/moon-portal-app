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
  if (method === "GET") {
    try {
      const jobPosts = await JobPost.find({}).lean();

      if (jobPosts) {
        res.status(200).json({ success: true, jobPosts });
      } else {
        res.status(400).json({ success: false });
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({ success: false });
    }
  } else {
    res.status(400).json({ success: false });
  }
}
