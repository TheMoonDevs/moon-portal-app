import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "Body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = await req.json();
    const newEngagement = await prisma.engagement.create({
      data: {
        client_id: body.client_id,
        developer_ids: body.developer_ids,
        title: body.title,
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive,
        engagementType: body.engagementType,
        numberOfHours: body.numberOfHours,
        progressPercentage: body.progressPercentage
      },
    });

    return NextResponse.json({
      status: "success",
      data: newEngagement,
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error creating engagement" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const engagements = await prisma.engagement.findMany();
    return NextResponse.json({
      status: "success",
      data: engagements,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error retrieving engagements" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updatedEngagement = await prisma.engagement.update({
      where: {
        id: body.id,
      },
      data: {
        client_id: body.client_id,
        developer_ids: body.developer_ids,
        title: body.title,
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive,
        engagementType: body.engagementType,
        numberOfHours: body.numberOfHours,
        progressPercentage: body.progressPercentage
      },
    });
    return NextResponse.json({
      status: "success",
      data: updatedEngagement,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error updating engagement" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const deletedEngagement = await prisma.engagement.delete({
      where: {
        id: body.id,
      },
    });
    return NextResponse.json({
      status: "success",
      data: deletedEngagement,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting engagement" }, { status: 500 });
  }
}
