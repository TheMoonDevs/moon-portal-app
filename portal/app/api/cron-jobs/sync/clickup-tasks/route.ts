export const dynamic = 'force-dynamic'; // static by default, unless reading the request
import type { Task } from '@db/client';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { filterTasks } from '@/utils/clickup/helper';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const apiUrl =
    'https://api.clickup.com/api/v2/team/9016017480/task?subtasks=false&statuses=to%20do&statuses=in%20review&statuses=in%20development&include_closed=false';
  const apiToken = process.env.CLICKUP_API_TOKEN as string;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ClickUp: ${response.status}`);
    }

    const data = await response.json();
    const filteredData: Task[] = filterTasks(data.tasks);
    await db.$transaction(async (_tx: any) => {
      await db.task.deleteMany();

      await db.task.createMany({
        data: filteredData,
      });
    });

    return NextResponse.json(
      { status: 'success', message: `Synced ${filteredData.length} Tasks` },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
