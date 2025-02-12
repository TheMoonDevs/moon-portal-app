import { skillsAndTechnologies } from "@/utils/constants/devProfileConstants";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    return new NextResponse(JSON.stringify(skillsAndTechnologies), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch skills' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}