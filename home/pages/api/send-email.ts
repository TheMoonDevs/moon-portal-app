import { NextApiRequest, NextApiResponse } from "next";
import AWSSesSdk from "@/utils/service/AWSSesSdk";

const ses = new AWSSesSdk(
  process.env.AWS_ACCESS_KEY_ID!,
  process.env.AWS_SECRET_ACCESS_KEY!,
  process.env.AMAZON_SES_REGION!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { sender, recipient, displayName, subject, bodyText, bodyHtml } =
    req.body;

  try {
    const data = await ses.sendEmail({
      sender,
      recipient,
      displayName,
      subject,
      bodyText,
      bodyHtml,
    });
    // console.log(data);
    res.status(200).json({ message: "Email sent successfully", data });
  } catch (error) {
    res.status(500).json({
      message: "Error sending email",
      error: (error as Error).message,
    });
  }
}
