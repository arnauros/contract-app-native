"use client";

import { RoomProvider } from "@/liveblocks.config";
import { LiveblocksComments } from "./LiveblocksComments";

export default function TestPage() {
  return (
    <RoomProvider
      id="test-room"
      initialPresence={{}}
      initialStorage={{
        comments: [],
      }}
    >
      <LiveblocksComments />
    </RoomProvider>
  );
}
