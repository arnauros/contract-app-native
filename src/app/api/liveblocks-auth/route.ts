import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.LIVEBLOCKS_SECRET_KEY) {
      throw new Error("LIVEBLOCKS_SECRET_KEY is not configured");
    }

    const body = await request.json();
    const { room } = body;

    if (!room) {
      return new Response(
        JSON.stringify({ error: "Room parameter is required" }),
        { status: 400 }
      );
    }

    // Create a session for the current user
    const session = liveblocks.prepareSession(
      "user-" + Math.random().toString(36).substr(2, 9),
      {
        userInfo: {
          name: "User",
          color: "#" + Math.floor(Math.random() * 16777215).toString(16),
        },
      }
    );

    // Give access to the room
    session.allow(room, session.FULL_ACCESS);

    // Return the auth response
    const { status, body: authBody } = await session.authorize();
    return new Response(authBody, {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({
        error: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
