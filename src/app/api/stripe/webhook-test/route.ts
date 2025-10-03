import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    console.log("Webhook test endpoint called");
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    console.log("Body length:", body.length);
    console.log("Has signature:", !!signature);

    return NextResponse.json({
      success: true,
      message: "Webhook test endpoint is working",
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ error: "Webhook test failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Webhook test endpoint is accessible",
    timestamp: new Date().toISOString(),
  });
}
