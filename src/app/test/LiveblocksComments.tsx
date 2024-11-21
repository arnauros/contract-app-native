"use client";

import { useStorage, useMutation, useRoom } from "@/liveblocks.config";
import { LiveList } from "@liveblocks/client";

export function LiveblocksComments() {
  const room = useRoom();
  const comments = useStorage((root) => root?.comments);

  const addComment = useMutation(
    ({ storage }, position: { x: number; y: number }) => {
      const newComment = {
        id: Date.now().toString(),
        text: "Test comment",
        position,
        createdAt: new Date().toISOString(),
      };

      if (!storage.root?.comments) {
        storage.root = { comments: new LiveList([newComment]) };
      } else {
        storage.root.comments.push(newComment);
      }
    },
    []
  );

  return (
    <div className="p-8">
      <div
        className="min-h-[400px] border border-dashed border-gray-300 rounded p-4 relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          addComment({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
      >
        Click anywhere to add a comment
        {comments?.map((comment) => (
          <div
            key={comment.id}
            className="absolute bg-white shadow-lg rounded p-2"
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
