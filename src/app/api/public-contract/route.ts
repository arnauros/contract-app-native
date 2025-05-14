import { NextRequest, NextResponse } from "next/server";
import { getContract } from "@/lib/firebase/firestore";
import { validateContractToken } from "@/lib/firebase/token";

export async function GET(request: NextRequest) {
  // Enable CORS
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  // Validate required parameters
  if (!id || !token) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    console.log(`PUBLIC API: Loading contract ${id} with token ${token}`);

    // Get contract from Firestore
    const result = await getContract(id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate token
    let isValid = false;
    try {
      const validation = await validateContractToken(id, token);
      isValid = validation.isValid;
      console.log(`PUBLIC API: Token validation result: ${isValid}`);
    } catch (error) {
      console.error("PUBLIC API: Token validation error:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Return contract if token is valid or contract is signed
    if (isValid || result.contract.status === "signed") {
      return NextResponse.json({ contract: result.contract }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("PUBLIC API: Error loading contract:", error);
    return NextResponse.json(
      { error: "Failed to load contract" },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
