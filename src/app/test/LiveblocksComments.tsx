"use client";

import { useStorage, useMutation, useRoom } from "@/liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { useEffect, useState } from "react";

export function LiveblocksComments() {
  const room = useRoom();
  const [isConnected, setIsConnected] = useState(false);

  // Modified storage access
  const comments = useStorage((root) => root?.comments);

  // Initialize storage with LiveList
  const initStorage = useMutation(({ storage }) => {
    console.log("Initializing storage with LiveList");
    storage.root = {
      comments: new LiveList(),
    };
  }, []);

  // Modified addComment mutation
  const addComment = useMutation(
    ({ storage }, text: string, position: { x: number; y: number }) => {
      console.log("Adding comment:", { text, position });

      const newComment = {
        id: Date.now().toString(),
        text,
        position,
        createdAt: new Date().toISOString(),
      };

      // Initialize if needed
      if (!storage.root?.comments) {
        storage.root = {
          comments: new LiveList([newComment]),
        };
      } else {
        // Add to existing list
        storage.root.comments.push(newComment);
      }
    },
    []
  );

  // Connection handling
  useEffect(() => {
    if (!room) return;

    const updateConnectionState = (status: string) => {
      console.log("Room status:", status);
      setIsConnected(status === "connected");
    };

    updateConnectionState(room.getStatus());
    const unsubscribe = room.subscribe("status", updateConnectionState);

    // Initialize storage when connected
    if (room.getStatus() === "connected") {
      initStorage();
    }

    return () => unsubscribe();
  }, [room, initStorage]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected) {
      console.warn("Not connected to room yet");
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    console.log("Click detected at position:", position);
    addComment("Test comment", position);
  };

  return (
    <div className="relative min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Comments Test</h1>

      {/* Debug info */}
      <div className="mb-4 p-2 bg-gray-100 rounded">
        <pre className="text-xs">
          Room Connected: {isConnected ? "Yes" : "No"}
          Comments: {JSON.stringify(comments ? [...comments] : [], null, 2)}
        </pre>
      </div>

      {/* Click area */}
      <div
        className="min-h-[400px] border border-dashed border-gray-300 rounded p-4 cursor-crosshair relative"
        onClick={handleClick}
      >
        Click anywhere to add a comment
        {/* Render comments */}
        {comments &&
          [...comments].map((comment) => (
            <div
              key={comment.id}
              className="absolute bg-white shadow-lg rounded p-2 z-10"
              style={{
                left: `${comment.position.x}px`,
                top: `${comment.position.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {comment.text}
            </div>
          ))}
      </div>
    </div>
  );
}
