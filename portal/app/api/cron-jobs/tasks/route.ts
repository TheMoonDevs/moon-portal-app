import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { filterTasks } from "@/utils/clickup/helper";
import { Task } from "@prisma/client";
export const dynamic = "force-dynamic"; // static by default, unless reading the request
export async function GET(request: NextRequest) {
  const apiUrl =
    "https://api.clickup.com/api/v2/team/9016017480/task?subtasks=false&statuses=to%20do&statuses=in%20review&statuses=in%20development&include_closed=false";
  const apiToken = process.env.CLICKUP_API_TOKEN as string;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ClickUp: ${response.status}`);
    }

    const data = await response.json();
    const filteredData: Task[] = filterTasks(data.tasks);
    const tasktxn = await prisma.$transaction(async (prisma) => {
      await prisma.task.deleteMany();

      await prisma.task.createMany({
        data: filteredData,
      });
    });

    return NextResponse.json(filteredData);
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
