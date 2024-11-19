"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";

interface RoomProps {
  children: ReactNode;
  contractId: string;
}

export function Room({ children, contractId }: RoomProps) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ room }),
        });

        if (!response.ok) {
          throw new Error("Failed to authenticate with Liveblocks");
        }

        return response.json();
      }}
    >
      <RoomProvider id={`contract-${contractId}`} initialPresence={{}}>
        <ClientSideSuspense fallback={<div>Loading comments...</div>}>
          {() => children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
