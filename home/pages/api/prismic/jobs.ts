import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/prismicio";

async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  if (req.method === "GET") {
    try {
      const client = createClient();
      const jobs = await client.getAllByType("jobapplication", {
        graphQuery: `{
          jobapplication {
            slices {
              ... on job {
                variation {
                  ... on default {
                    primary {
                      title
                      department
                      image
                      assignment_url
                      spreadsheet_url
                    }
                  }
                }
              }
            }
          }
        }`,
      });

      const simplifiedJobs = jobs.map((job) => ({
        id: job.id,
        uid: job.uid,
        title: job?.data?.slices[0]?.primary?.title,
        department: job?.data?.slices[0]?.primary?.department,
        image: job?.data?.slices[0]?.primary?.image?.url,
        assignment_url: job?.data?.slices[0]?.primary?.assignment_url,
        spreadsheet_url: job?.data?.slices[0]?.primary?.spreadsheet_url,
        fetch_more_info: job.href,
        route_url: job.url,
        last_publication_date: job.last_publication_date,
      }));

      return res.status(201).json({ jobs: simplifiedJobs });
    } catch (error) {
      console.error(`Error fetching job application data: ${error}`);
      res.status(500).json({ message: "Error fetching job application data" });
    }
  }
}

export default handler;
