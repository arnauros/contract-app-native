import React, { useRef, useState, useCallback, useEffect } from "react";
import { Comment as CommentType } from "@/lib/firebase/firestore";
import { PinnedComment } from "./PinnedComment";
import { CommentMarker } from "./CommentMarker";

interface OverlayCommentProps {
  comment: CommentType;
  maxZIndex: number;
  onDragChange: (dragging: boolean) => void;
  onDismiss: (commentId: string) => void;
  onEdit: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}

export function OverlayComment({
  comment,
  maxZIndex,
  onDragChange,
  onDismiss,
  onEdit,
  onAddReply,
}: OverlayCommentProps) {
  console.log(
    "🔄 OverlayComment rendering:",
    comment.id,
    "at position:",
    comment.position
  );

  const commentRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);

  // Default position if not set
  const defaultPosition = { x: 20, y: 20, zIndex: maxZIndex + 1 };

  // Use comment position or default
  const [coords, setCoords] = useState<{
    x: number;
    y: number;
    zIndex: number;
  }>(comment.position || defaultPosition);

  console.log("📍 Comment position set to:", coords);

  // Handle pointer down to start dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Stop event propagation to prevent container click
      e.stopPropagation();

      if (!commentRef.current) {
        return;
      }

      console.log("👇 Pointer down on comment:", comment.id);
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = commentRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.pageX - rect.left - window.scrollX,
        y: e.pageY - rect.top - window.scrollY,
      };
      dragStart.current = {
        x: e.pageX,
        y: e.pageY,
      };
      draggingRef.current = true;
      onDragChange(true);
      console.log(
        "🔄 Started dragging comment:",
        comment.id,
        "dragOffset:",
        dragOffset.current
      );
    },
    [comment.id, onDragChange]
  );

  // Handle pointer move during dragging
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Stop event propagation
      e.stopPropagation();

      if (!draggingRef.current) {
        return;
      }

      const { x, y } = dragOffset.current;
      const newX = e.pageX - x;
      const newY = e.pageY - y;

      console.log("🔄 Dragging comment:", comment.id, "to position:", {
        x: newX,
        y: newY,
      });

      setCoords((prev) => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    },
    [comment.id]
  );

  // Handle pointer up to end dragging
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Stop event propagation
      e.stopPropagation();

      if (!draggingRef.current || !commentRef.current) {
        return;
      }

      // If no movement (just a click), toggle open state
      if (
        Math.abs(e.pageX - dragStart.current.x) < 3 &&
        Math.abs(e.pageY - dragStart.current.y) < 3
      ) {
        console.log(
          "👆 Comment clicked (no drag):",
          comment.id,
          "toggling open state:",
          !isOpen
        );
        setIsOpen(!isOpen);
      } else {
        console.log("👆 Finished dragging comment:", comment.id);
      }

      // Update the position with new z-index
      setCoords((prev) => ({
        ...prev,
        zIndex: maxZIndex + 1,
      }));

      // End drag
      draggingRef.current = false;
      onDragChange(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [comment.id, isOpen, maxZIndex, onDragChange]
  );

  // Handle increasing z-index when comment is focused
  const handleIncreaseZIndex = useCallback(() => {
    if (maxZIndex === coords.zIndex) {
      return;
    }

    console.log(
      "📈 Increasing z-index for comment:",
      comment.id,
      "from",
      coords.zIndex,
      "to",
      maxZIndex + 1
    );

    setCoords((prev) => ({
      ...prev,
      zIndex: maxZIndex + 1,
    }));
  }, [comment.id, coords.zIndex, maxZIndex]);

  // Handle marker click - separate from drag handling
  const handleMarkerClick = useCallback(
    (e: React.MouseEvent) => {
      console.log("🖱️ Comment marker clicked directly:", comment.id);
      e.stopPropagation(); // Prevent click from bubbling to container

      // If we're not dragging, toggle open state
      if (!draggingRef.current) {
        console.log("👆 Toggling comment open state:", !isOpen);
        setIsOpen(!isOpen);
      }
    },
    [comment.id, isOpen]
  );

  // Calculate reply count for the marker badge
  const replyCount = comment.replies?.length || 0;

  return (
    <div
      ref={commentRef}
      id={`comment-${comment.id}`}
      className="absolute"
      style={{
        transform: `translate(${coords.x}px, ${coords.y}px)`,
        zIndex: draggingRef.current ? 9999999 : coords.zIndex,
      }}
      data-ignore-when-placing-composer
      onClick={(e) => {
        // Stop event propagation to prevent container click
        e.stopPropagation();
        console.log("🛑 Stopped propagation on comment container:", comment.id);
      }}
    >
      {/* Gradient Circle Marker */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleMarkerClick}
      >
        <CommentMarker
          userName={comment.userName}
          userAvatar={comment.userAvatar}
          count={replyCount > 0 ? replyCount + 1 : 0}
        />
      </div>

      {/* Comment Thread - Only visible when isOpen is true */}
      {isOpen && (
        <div
          className="absolute top-14 left-0 mt-2 z-10"
          onClick={(e) => e.stopPropagation()} // Prevent clicks in the comment thread from creating new comments
        >
          <PinnedComment
            comment={comment}
            onDismiss={onDismiss}
            onEdit={onEdit}
            onAddReply={onAddReply}
            onFocus={handleIncreaseZIndex}
          />
        </div>
      )}
    </div>
  );
}
