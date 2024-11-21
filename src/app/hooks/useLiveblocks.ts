import { createClient } from "@liveblocks/client";
import { useEffect, useState } from "react";

const client = createClient({
  publicApiKey:
    "pk_prod_aRjbwUZVgt1LU6WaJXJZahntx1zYDSaDrtfP7jPbs1pETGzUvrIREZPGzoerjwVI",
});

export function useLiveblocks() {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const { room } = client.enterRoom("test-room", {
      initialStorage: {
        comments: [],
      },
    });

    // Get initial comments
    room.getStorage().then((storage) => {
      if (storage?.comments) {
        setComments(storage.comments);
      }
    });

    // Subscribe to changes
    const unsubscribe = room.subscribe("storage", (root) => {
      if (root?.comments) {
        setComments(root.comments);
      }
    });

    return () => unsubscribe();
  }, []);

  const addComment = async (
    text: string,
    position: { x: number; y: number }
  ) => {
    const { room } = client.enterRoom("test-room");
    await room.updateStorage((root) => {
      if (!root.comments) {
        root.comments = [];
      }
      root.comments.push({
        id: Date.now(),
        text,
        position,
        createdAt: new Date().toISOString(),
      });
    });
  };

  return {
    comments,
    addComment,
  };
}
