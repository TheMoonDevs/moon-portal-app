import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/utils/services/mongoose";
import JobPost from "@/utils/services/models/JobPost";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({ success: false });
    return;
  }

  await dbConnect();

  switch (method) {
    case "POST":
      try {
        const newJobPost = new JobPost(req.body);
        const savedJobPost = await newJobPost.save();

        res.status(201).json({ success: true, data: savedJobPost });
      } catch (error) {
        console.error(error);
        res.status(400).json({ success: false });
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
