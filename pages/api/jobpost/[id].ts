import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/utils/services/mongoose";
import JobPost from "@/utils/services/models/JobPost";

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
        const jobPostQuery: any = {};
        if (req.query.id) jobPostQuery["_id"] = req.query.id;
        if (req.query.dept_name)
          jobPostQuery["dept_name"] = req.query.dept_name;
        // Add more conditions as needed for other parameters

        const jobPosts = await JobPost.find(jobPostQuery).lean();

        if (jobPosts) {
          res.status(200).json({ success: true, jobPosts });
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
        const newJobPost = new JobPost(req.body);
        const savedJobPost = await newJobPost.save();

        res.status(201).json({ success: true, data: savedJobPost });
      } catch (error) {
        console.error(error);
        res.status(400).json({ success: false });
      }
      break;

    case "PUT" /* Edit a model by its ID */:
      try {
        const updatedJobPost = await JobPost.findByIdAndUpdate(id, req.body, {
          new: true,
          runValidators: true,
        });
        if (!updatedJobPost) {
          return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: updatedJobPost });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;

    case "DELETE" /* Delete a model by its ID */:
      try {
        const deletedJobPost = await JobPost.deleteOne({ _id: id });
        if (!deletedJobPost) {
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
