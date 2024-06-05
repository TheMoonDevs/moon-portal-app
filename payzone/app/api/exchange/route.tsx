import { prisma } from "@/prisma/prisma";
import {
  PrismaClient,
  TRANSACTIONCATEGORY,
  TRANSACTIONSTATUS,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, res: NextResponse) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const exchangeData = JSON.parse(body);
  // console.log("req.body",req.body);

  try {
    const updateData = await prisma.configData.upsert({
      where: {
        configId: "tmd-credis-exchange-rate",
      },
      create: {
        configId: "tmd-credis-exchange-rate",
        configApp: "payzone",
        configType: "singular",
        configData: exchangeData,
      },
      update: {
        configData: exchangeData,
      },
    });

    return new NextResponse(
      JSON.stringify({
        status: "success",
        data: updateData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating PayTransaction:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // console.log("HERE IAM");

    const configDatas = await prisma.configData.findFirst({
      where: {
        configId: "tmd-credis-exchange-rate",
      },
    });

    const exchangeInfoResponse = await fetch(
      "https://api.freecurrencyapi.com/v1/latest?apikey=fca_live_B7yCVh27FHfEBAd0eiJAk6IRnUuH4PUr4ICOx1cx",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let exchangeInfo;
    if (exchangeInfoResponse) exchangeInfo = await exchangeInfoResponse.json();

    console.log("exchangeData", configDatas, exchangeInfo);

    const jsonResponse = {
      status: "success",
      data: {
        exchangeData: configDatas
          ? configDatas.configData
          : {
              liquidityINR: 0,
              liquidityTMDCredits: 0,
              creditsRateINR: 1,
              creditsRateUSD: null,
              timestamp: Date.now(),
            },
        exchangeCurrency: exchangeInfo ? exchangeInfo?.data : null,
      },
    };

    return new NextResponse(JSON.stringify(jsonResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        //"Cache-Control": "public, s-maxage=3600"
      },
    });
  } catch (error) {
    // console.log(error);
    return new NextResponse(JSON.stringify({ error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
