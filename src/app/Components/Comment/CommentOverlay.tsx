"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Comment as CommentType } from "@/lib/firebase/firestore";
import { OverlayComment } from "./OverlayComment";

interface CommentOverlayProps {
  comments: CommentType[];
  onAddComment: (position: { x: number; y: number }) => void;
  onDismissComment: (commentId: string) => void;
  onEditComment: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}

export function CommentOverlay({
  comments,
  onAddComment,
  onDismissComment,
  onEditComment,
  onAddReply,
}: CommentOverlayProps) {
  console.log("🔄 CommentOverlay rendering with", comments.length, "comments");

  const [beingDragged, setBeingDragged] = useState(false);
  const [maxZIndex, setMaxZIndex] = useState(100);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Filter out comments without position data or that are dismissed
  const validComments = comments.filter(
    (comment) =>
      !comment.isDismissed &&
      comment.position &&
      comment.position.x !== undefined &&
      comment.position.y !== undefined
  );

  console.log(
    "📊 CommentOverlay valid comments:",
    validComments.length,
    "of",
    comments.length
  );
  console.log(
    "💬 Comment Details:",
    validComments.map((c) => ({
      id: c.id,
      position: c.position,
      comment:
        c.comment.substring(0, 20) + (c.comment.length > 20 ? "..." : ""),
    }))
  );

  // Update max z-index when comments change
  useEffect(() => {
    if (validComments.length > 0) {
      const highest = validComments.reduce((max, comment) => {
        const zIndex = comment.position?.zIndex || 0;
        return zIndex > max ? zIndex : max;
      }, 100);
      console.log("📈 Setting maxZIndex to:", highest);
      setMaxZIndex(highest);
    }
  }, [validComments]);

  // Check if a click is on a comment marker
  const isClickOnCommentMarker = useCallback((e: React.MouseEvent) => {
    // Check if the click target is a comment marker or its child
    const target = e.target as HTMLElement;

    // Look for marker by checking if the clicked element or any of its parents has a comment marker class/attribute
    let currentElement: HTMLElement | null = target;
    while (currentElement && currentElement !== overlayRef.current) {
      // Check for comment marker elements
      if (
        currentElement.getAttribute("data-comment-marker") === "true" ||
        currentElement.closest('[data-comment-marker="true"]')
      ) {
        console.log("🎯 Click detected on comment marker", {
          element: currentElement.tagName,
          dataset: currentElement.dataset,
        });
        return true;
      }
      currentElement = currentElement.parentElement;
    }

    console.log("🔍 Click is NOT on a comment marker");
    return false;
  }, []);

  // Handle clicking on the contract to add a new comment
  const handleContractClick = useCallback(
    (e: React.MouseEvent) => {
      console.log("🖱️ Contract overlay clicked", {
        target: (e.target as HTMLElement).tagName,
        clientX: e.clientX,
        clientY: e.clientY,
      });

      // Skip if we're dragging or if click was on a comment marker
      if (beingDragged) {
        console.log("📌 Ignoring click - comment is being dragged");
        return;
      }

      // Check if the click is on or within a comment marker
      if (isClickOnCommentMarker(e)) {
        console.log("📌 Ignoring click - it's on a comment marker");
        return;
      }

      // Get the rect of the container element
      const rect = e.currentTarget.getBoundingClientRect();

      // Calculate relative position within the container
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      console.log("➕ Adding new comment at position:", { x, y });

      // Call the parent component's add comment handler
      onAddComment({ x, y });
    },
    [beingDragged, isClickOnCommentMarker, onAddComment]
  );

  return (
    <div
      ref={overlayRef}
      className="relative w-full h-full"
      style={{ pointerEvents: beingDragged ? "none" : "auto" }}
      data-hide-cursors
      onClick={handleContractClick}
    >
      {validComments.map((comment) => (
        <OverlayComment
          key={comment.id}
          comment={comment}
          maxZIndex={maxZIndex}
          onDragChange={setBeingDragged}
          onDismiss={onDismissComment}
          onEdit={onEditComment}
          onAddReply={onAddReply}
        />
      ))}
    </div>
  );
}
