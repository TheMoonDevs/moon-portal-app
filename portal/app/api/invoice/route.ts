import { InvoicePaymentData } from "@/components/screens/InvoiceGenerator/InvoicePage";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  if (!req.body) {
    return new NextResponse(JSON.stringify({ error: "body not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const invoicePaymentData: InvoicePaymentData = JSON.parse(body);

  const { cryptoPaymentInfo, bankPaymentInfo } = invoicePaymentData;

  if (!cryptoPaymentInfo || !bankPaymentInfo) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid request parameters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const updateData = await prisma.configData.upsert({
      where: { configId: "invoice-payment-subhakar" },
      create: {
        configId: "invoice-payment-subhakar",
        configApp: "portal",
        configType: "singular",
        configData: {
          cryptoPaymentInfo: cryptoPaymentInfo,
          bankPaymentInfo: bankPaymentInfo,
        },
      },
      update: {
        configData: {
          cryptoPaymentInfo: cryptoPaymentInfo,
          bankPaymentInfo: bankPaymentInfo,
        },
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
    console.error("Error adding invoice payment configuration:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const config = await prisma.configData.findFirst({
      where: { configId: "invoice-payment-subhakar" },
    });

    if (!config) {
      return new NextResponse(JSON.stringify({ error: "Configuration not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(JSON.stringify(config), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error retrieving configuration:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
