import { NextResponse } from "next/server";
import { getSignatures } from "@/lib/firebase/firestore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get("contractId");

  if (!contractId) {
    return NextResponse.json(
      { error: "Contract ID is required" },
      { status: 400 }
    );
  }

  try {
    const result = await getSignatures(contractId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return NextResponse.json(
      { error: "Failed to fetch signatures" },
      { status: 500 }
    );
  }
}
