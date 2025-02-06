import { NextRequest, NextResponse } from "next/server";
import AWSSesSdk from "@/utils/service/AWSSesSdk";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const ses = new AWSSesSdk(
    process.env.AWS_ACCESS_KEY_ID!,
    process.env.AWS_SECRET_ACCESS_KEY!,
    process.env.AMAZON_SES_REGION!
  );
  
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 }
    );
  }

  const { sender, recipient, displayName, subject, bodyText, bodyHtml } = await req.json();

  try {
    const data = await ses.sendEmail({
      sender,
      recipient,
      displayName,
      subject,
      bodyText,
      bodyHtml,
    });
    
    // Return success response
    return NextResponse.json({ message: "Email sent successfully", data }, { status: 200 });
  } catch (error) {
    // Return error response
    return NextResponse.json({
      message: "Error sending email",
      error: (error as Error).message,
    }, { status: 500 });
  }
}
