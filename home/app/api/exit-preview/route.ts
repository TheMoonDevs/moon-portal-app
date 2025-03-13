import { exitPreview } from "@prismicio/next";

export const runtime = "edge";

export async function GET() {
  return await exitPreview();
}