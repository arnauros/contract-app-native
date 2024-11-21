import { createClient, LiveList } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey:
    "pk_prod_aRjbwUZVgt1LU6WaJXJZahntx1zYDSaDrtfP7jPbs1pETGzUvrIREZPGzoerjwVI",
  throttle: 16, // Optional: Controls sync frequency
});

type Storage = {
  comments: LiveList<{
    id: string;
    text: string;
    position: { x: number; y: number };
    createdAt: string;
  }>;
};

export const { RoomProvider, useStorage, useMutation, useRoom } =
  createRoomContext<{}, Storage>(client);
