import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as string;

    console.log("Upload API request received:", { userId, type });

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // In development, always return a mock response for testing
    // This avoids Firebase Admin configuration issues during development
    if (process.env.NODE_ENV === "development") {
      const timestamp = Date.now();
      const mockUrl =
        type === "profileImage"
          ? "/placeholder-profile.png"
          : "/placeholder-banner.png";

      console.log("Development mode - returning mock response");

      return NextResponse.json({
        success: true,
        url: mockUrl,
        path: `mock/users/${userId}/${type}/${timestamp}.png`,
        mock: true,
      });
    }

    // For production, implement actual Firebase storage logic
    // This code currently returns an error as it's not fully implemented
    return NextResponse.json(
      {
        error: "Server-side upload not yet implemented in production",
        details: "Use client-side direct upload instead",
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error processing upload request:", error);
    return NextResponse.json(
      {
        error: "Failed to process upload request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
