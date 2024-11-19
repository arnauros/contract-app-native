"use client";

import { useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useCallback, useState, useEffect } from "react";

export function OverlayComments() {
  const { threads } = useThreads();
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  console.log("🧵 Current threads:", threads);

  useEffect(() => {
    console.log("🔄 OverlayComments mounted");

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const block = target.closest("[data-block-id]");

      if (block) {
        const blockId = block.getAttribute("data-block-id");
        const rect = block.getBoundingClientRect();

        console.log("🎯 Clicked block:", {
          id: blockId,
          element: block,
          position: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        });

        setSelectedBlock(blockId);
        setClickPosition({
          x: e.clientX,
          y: e.clientY,
        });

        // Add visual feedback
        block.classList.add(
          "bg-yellow-50",
          "transition-colors",
          "duration-200"
        );
        setTimeout(() => {
          block.classList.remove("bg-yellow-50");
        }, 500);
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      console.log("🧹 OverlayComments unmounted");
    };
  }, []);

  const handleSubmit = useCallback(
    (message: string) => {
      console.log("💬 New comment:", {
        blockId: selectedBlock,
        position: clickPosition,
        message,
      });

      setSelectedBlock(null);
      setClickPosition(null);
    },
    [selectedBlock, clickPosition]
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Overlay for click handling */}
      <div className="absolute inset-0 pointer-events-auto" />

      {/* Comment composer */}
      {selectedBlock && clickPosition && (
        <div
          className="fixed bg-white p-4 rounded-lg shadow-lg z-50 pointer-events-auto"
          style={{
            left: clickPosition.x,
            top: clickPosition.y,
            transform: "translate(-50%, -100%)",
            marginTop: -10,
          }}
        >
          <Composer onSubmit={handleSubmit} />
        </div>
      )}

      {/* Existing threads */}
      {threads.map((thread) => (
        <div
          key={thread.id}
          className="absolute pointer-events-auto"
          style={{
            left: thread.metadata.x,
            top: thread.metadata.y,
            zIndex: 40,
          }}
        >
          <Thread thread={thread} />
        </div>
      ))}
    </div>
  );
}
