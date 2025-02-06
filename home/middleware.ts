export const runtime = "edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const slug = req.nextUrl.pathname.split("/").pop();
  try {
    const fetchUrlData = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_API_URL}/short-url/get-link/${slug}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (fetchUrlData.status === 404) {
      return NextResponse.redirect(req.nextUrl.origin);
    }
    const data = await fetchUrlData.json();

    if (data?.redirectTo) {
      return NextResponse.redirect(data.redirectTo);
    }
  } catch (error) {
    console.log(error);
    return NextResponse.redirect(req.nextUrl.origin);
  }
}

export const config = {
  matcher: "/l/:path*",
};
