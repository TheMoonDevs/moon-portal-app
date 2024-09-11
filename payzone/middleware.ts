import { NextResponse, type NextRequest } from "next/server";

// Middleware
export async function middleware(request: NextRequest) {
  // Response
  const response = NextResponse.next();

  // Check API key for methods that modify the database
  const method = request.method.toUpperCase();
  const modifyingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (modifyingMethods.includes(method)) {
    const apiKey = request.headers.get("tmd_payzone_api_key");
    const expectedApiKey = process.env.NEXT_PUBLIC_TMD_PAYZONE_API_KEY;

    if (apiKey !== expectedApiKey) {
      return new NextResponse(
        JSON.stringify({ error: "Invalid or missing API key" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: "/api/:path*",
};
