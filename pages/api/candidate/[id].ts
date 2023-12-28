import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/utils/services/mongoose";
import Candidate from "@/utils/services/models/Candidate";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    query: { id },
    method,
  } = req;
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    res.status(401).json({ success: false });
    return;
  }

  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const candidateQuery: any = {};
        if (req.query.id) candidateQuery["_id"] = req.query.id;
        if (req.query.name) candidateQuery["name"] = req.query.name;
        // Add more conditions as needed for other parameters

        const candidates = await Candidate.find(candidateQuery).lean();

        if (candidates) {
          res.status(200).json({ success: true, candidates });
        } else {
          res.status(400).json({ success: false });
        }
      } catch (error) {
        console.error(error);
        res.status(400).json({ success: false });
      }
      break;

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

    case "PUT" /* Edit a model by its ID */:
      try {
        const updatedCandidate = await Candidate.findByIdAndUpdate(
          id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );
        if (!updatedCandidate) {
          return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: updatedCandidate });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;

    case "DELETE" /* Delete a model by its ID */:
      try {
        const deletedCandidate = await Candidate.deleteOne({ _id: id });
        if (!deletedCandidate) {
          return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
