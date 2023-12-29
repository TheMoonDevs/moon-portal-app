import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/utils/services/mongoose";
import Candidate from "@/utils/services/models/Candidate";

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
        const candidate = await new Candidate(req.body);
        await candidate.save();

        res.status(201).json({ success: true, candidate: candidate });
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
