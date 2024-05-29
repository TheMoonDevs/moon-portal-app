import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { job_id: string } }
) {
  {
    const { job_id } = params;

    let error_response: any;

    if (!job_id) {
      error_response = {
        status: "fail",
        message: "Job ID is required",
      };
    }

    try {
      const candidates = await prisma.candidate.findMany({
        where: {
          jobPostId: job_id,
        },
      });

      if (error_response) {
        return new NextResponse(JSON.stringify(error_response), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      let json_response = {
        status: "success",
        data: {
          candidates,
        },
      };

      return new NextResponse(JSON.stringify(json_response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new NextResponse(JSON.stringify(e), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
