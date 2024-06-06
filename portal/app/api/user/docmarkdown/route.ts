import { prisma } from "@/prisma/prisma";
import { NextResponse, NextRequest } from "next/server";

// 📄 GET: Fetch docMarkDown entries based on id, userId, or docType
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") as string; // 🆔 Get the document ID from query params
  const userId = request.nextUrl.searchParams.get("userId") as string; // 👤 Get the user ID from query params
  const docType = request.nextUrl.searchParams.get("docType") as string; // 📑 Get the document type from query params

  try {
    // 📚 Fetch documents from the database
    const docMarkDowns = await prisma.docMarkDown.findMany({
      where: {
        ...(id && { id }), // 🆔 Filter by ID if provided
        ...(userId && { userId }), // 👤 Filter by user ID if provided
        ...(docType && { docType }), // 📑 Filter by document type if provided
      },
    });

    // 🟢 Respond with success and fetched data
    const jsonResponse = {
      status: "success",
      data: {
        docMarkDowns,
      },
    };

    return NextResponse.json(jsonResponse); // 📬 Send JSON response
  } catch (e) {
    console.error(e);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500, 
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// 📝 PUT: Create or update a docMarkDown entry
export async function PUT(request: NextRequest) {
  try {
    const { id, ...rest } = await request.json(); // 📥 Parse JSON request body

    let docMarkDown;
    if (id && id.length > 2) {
      // 🆔 If an ID is provided and valid, upsert the document
      docMarkDown = await prisma.docMarkDown.upsert({
        where: { id }, // 📌 Upsert based on ID
        create: { id, ...rest }, // ➕ Create new entry if not exists
        update: { ...rest }, // ✏️ Update existing entry if exists
      });
    } else {
      // ➕ Create a new document if ID is not provided
      docMarkDown = await prisma.docMarkDown.create({
        data: { ...rest },
      });
    }

    // 🟢 Respond with success and the upserted/created data
    const jsonResponse = {
      status: "success",
      data: {
        docMarkDown,
      },
    };

    return NextResponse.json(jsonResponse); // 📬 Send JSON response
  } catch (e) {
    console.error(e); 
    return new NextResponse(JSON.stringify({ error: "Bad Request" }), {
      status: 400, 
      headers: { "Content-Type": "application/json" },
    });
  }
}
