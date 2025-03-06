import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { JsonObject } from '@prisma/client/runtime/library';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 },
      );
    }

    const project = await prisma.botProject.findUnique({
      where: { id },
      select: { projectConfiguration: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Project configuration fetched successfully',
      configs: project.projectConfiguration,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, projectConfiguration } = await req.json();
    const existingProject = await prisma.botProject.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedConfiguration = {
      ...((existingProject?.projectConfiguration as JsonObject) || {}),
      ...projectConfiguration,
    };

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: { projectConfiguration: updatedConfiguration },
    });
    return NextResponse.json({
      message: 'Configuration updated successfully',
      updatedProject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, keysToDelete } = await req.json();
    const existingProject = await prisma.botProject.findUnique({
      where: { id },
      select: { projectConfiguration: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedConfiguration = {
      ...(existingProject?.projectConfiguration as JsonObject),
    };
    keysToDelete.forEach((key: string) => delete updatedConfiguration[key]);

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: { projectConfiguration: updatedConfiguration },
    });
    return NextResponse.json({
      message: 'Configuration deleted successfully',
      updatedProject,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
