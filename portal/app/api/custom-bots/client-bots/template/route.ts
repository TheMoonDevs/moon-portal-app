// api/custom-bots/client-bots/template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

// Get all BotTemplates (predefined + custom)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');

    // If a clientId is provided, include templates with a null clientId (predefined) or matching clientId.
    const filters = clientId ? { OR: [{ clientId: null }, { clientId }] } : {};
    const templates = await prisma.clientBotTemplate.findMany({
      where: filters,
    });
    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Error fetching templates' },
      { status: 500 },
    );
  }
}

// Create a new BotTemplate (custom or predefined)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, type, name, requiredKeys } = body;

    const newTemplate = await prisma.clientBotTemplate.create({
      data: { clientId, type, name, requiredKeys },
    });
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating template' },
      { status: 500 },
    );
  }
}

// Update an existing BotTemplate
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, requiredKeys } = body;

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const updatedTemplate = await prisma.clientBotTemplate.update({
      where: { id },
      data: { requiredKeys },
    });
    return NextResponse.json(updatedTemplate, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error updating template' },
      { status: 500 },
    );
  }
}

// Delete a BotTemplate
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.clientBotTemplate.delete({ where: { id } });
    return NextResponse.json(
      { message: 'Deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Error deleting template' },
      { status: 500 },
    );
  }
}
