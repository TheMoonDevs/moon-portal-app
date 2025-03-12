import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';
import { UPDATEFROM, UPDATETYPE } from '@prisma/client';

// Create ClientRequestFunction
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name,
            type,
            mode,
            service,
            baseUrl,
            endpoints,
            clientRequestId,
            claudiaJson,
        } = body;

        if (!name || !service || !baseUrl || !endpoints || !clientRequestId || !type || !mode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get clientId and botProjectId from ClientRequest
        const clientRequest = await prisma.clientRequest.findUnique({
            where: { id: clientRequestId },
        });

        if (!clientRequest) {
            return NextResponse.json({ error: 'ClientRequest not found' }, { status: 404 });
        }

        const { clientId, botProjectId } = clientRequest;

        // Create the ClientRequestFunction
        const clientFunction = await prisma.clientRequestFunction.create({
            data: {
                name,
                type,
                mode,
                service,
                baseUrl,
                endpoints,
                clientId,
                botProjectId,
                originClientRequestId: clientRequestId,
                metadata: {
                    claudiaJson,
                },
            },
        });

        // Add notification in chat if needed
        await prisma.requestMessage.create({
            data: {
                originClientRequestId: clientRequestId,
                clientId,
                message: `A new ${type.toLowerCase()} function "${name}" for ${service} service has been deployed to ${mode} mode`,
                updateType: UPDATETYPE.MESSAGE,
                updateFrom: UPDATEFROM.BOT,
            },
        });

        return NextResponse.json(clientFunction, { status: 201 });
    } catch (error) {
        console.error('Error creating ClientRequestFunction:', error);
        return NextResponse.json(
            { error: 'Error creating ClientRequestFunction' },
            { status: 500 },
        );
    }
}

// Get ClientRequestFunction(s)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const clientId = searchParams.get('clientId');
        const botProjectId = searchParams.get('botProjectId');
        const clientRequestId = searchParams.get('clientRequestId');

        if (!id && !clientId && !botProjectId && !clientRequestId) {
            return NextResponse.json({ error: 'Missing id, clientId, botProjectId, or clientRequestId parameter' }, { status: 400 });
        }

        const clientFunctions = await prisma.clientRequestFunction.findMany({
            where: {
                ...(id && { id }),
                ...(clientId && { clientId }),
                ...(botProjectId && { botProjectId }),
                ...(clientRequestId && { originClientRequestId: clientRequestId }),
            },
        });

        return NextResponse.json({ clientFunctions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching ClientRequestFunction:', error);
        return NextResponse.json(
            { error: 'Error fetching ClientRequestFunction' },
            { status: 500 },
        );
    }
}

// Update ClientRequestFunction
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, service, baseUrl, endpoints, type, mode, claudiaJson } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing function ID' }, { status: 400 });
        }

        const clientFunction = await prisma.clientRequestFunction.findUnique({
            where: { id },
        });

        if (!clientFunction) {
            return NextResponse.json({ error: 'Function not found' }, { status: 404 });
        }

        // Only update fields that are provided
        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (service !== undefined) updateData.service = service;
        if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
        if (endpoints !== undefined) updateData.endpoints = endpoints;
        if (type !== undefined) updateData.type = type;
        if (mode !== undefined) updateData.mode = mode;
        if (claudiaJson !== undefined) updateData.metadata.claudiaJson = claudiaJson;

        const updatedFunction = await prisma.clientRequestFunction.update({
            where: { id },
            data: updateData,
        });

        // Notify in chat about the update
        if (Object.keys(updateData).length > 0) {
            await prisma.requestMessage.create({
                data: {
                    originClientRequestId: clientFunction.originClientRequestId,
                    clientId: clientFunction.clientId,
                    message: `Function "${updatedFunction.name}" has been updated.`,
                    updateType: UPDATETYPE.MESSAGE,
                    updateFrom: UPDATEFROM.BOT,
                },
            });
        }

        return NextResponse.json(updatedFunction, { status: 200 });
    } catch (error) {
        console.error('Error updating ClientRequestFunction:', error);
        return NextResponse.json(
            { error: 'Error updating ClientRequestFunction' },
            { status: 500 },
        );
    }
}

// Delete ClientRequestFunction
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing function ID' }, { status: 400 });
        }

        const clientFunction = await prisma.clientRequestFunction.findUnique({
            where: { id },
        });

        if (!clientFunction) {
            return NextResponse.json({ error: 'Function not found' }, { status: 404 });
        }

        // Store data before deletion for notifications
        const { name, originClientRequestId, clientId, mode } = clientFunction;

        // Delete the function
        await prisma.clientRequestFunction.delete({
            where: { id },
        });

        // Notify in chat about deletion
        await prisma.requestMessage.create({
            data: {
                originClientRequestId,
                clientId,
                message: `Function "${name}" has been removed from ${mode} mode`,
                updateType: UPDATETYPE.MESSAGE,
                updateFrom: UPDATEFROM.BOT,
            },
        });

        return NextResponse.json(
            { message: 'Function deleted successfully' },
            { status: 200 },
        );
    } catch (error) {
        console.error('Error deleting ClientRequestFunction:', error);
        return NextResponse.json(
            { error: 'Error deleting ClientRequestFunction' },
            { status: 500 },
        );
    }
}
