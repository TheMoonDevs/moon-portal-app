export const runtime = "edge";
import { exitPreview } from "@prismicio/next";

export async function GET() {
  return await exitPreview();
}