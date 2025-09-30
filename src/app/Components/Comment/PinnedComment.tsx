"use client";

import { useState } from "react";
import { Comment as CommentType } from "@/lib/firebase/firestore";
import { XMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/utils";

interface PinnedCommentProps {
  comment: CommentType;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  onDismiss: (commentId: string) => void;
  onEdit: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}

export function PinnedComment({
  comment,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFocus,
  onDismiss,
  onEdit,
  onAddReply,
}: PinnedCommentProps) {
  console.log("🔄 PinnedComment rendering:", comment.id);

  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    console.log(
      "🔽 Toggling comment expanded state:",
      comment.id,
      newExpandedState ? "expanded" : "collapsed"
    );
    setIsExpanded(newExpandedState);
    if (newExpandedState) {
      console.log("🔍 Focusing comment:", comment.id);
      onFocus?.();
    }
  };

  const handleSubmitReply = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && replyText.trim() && comment.id) {
      console.log(
        "💬 Submitting reply to comment:",
        comment.id,
        "Reply:",
        replyText
      );
      onAddReply(comment.id, replyText);
      setReplyText("");
    }
  };

  const handleDismiss = () => {
    if (comment.id) {
      console.log("❌ Dismissing comment:", comment.id);
      onDismiss(comment.id);
    }
  };

  const handleEdit = () => {
    console.log("✏️ Editing comment:", comment.id, "blockId:", comment.blockId);
    onEdit(comment.blockId);
  };

  return (
    <div
      className="relative"
      onPointerDown={(e) => {
        console.log("👇 PinnedComment pointer down:", comment.id);
        onPointerDown?.(e);
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
      }}
      onPointerUp={(e) => {
        console.log("👆 PinnedComment pointer up:", comment.id);
        onPointerUp?.(e);
      }}
    >
      {/* Comment indicator dot */}
      <div
        className={`w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white
                  cursor-pointer shadow-md hover:scale-110 transition-transform duration-100
                  ${isExpanded ? "border-2 border-white" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleExpand();
        }}
      >
        <span className="text-xs font-bold">
          {comment.replies && comment.replies.length > 0
            ? comment.replies.length + 1
            : 1}
        </span>
      </div>

      {/* Comment popup - only shown when expanded */}
      {isExpanded && (
        <div
          className="absolute top-8 left-0 bg-white rounded-lg shadow-lg w-72 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {comment.userName || "Anonymous"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(comment.timestamp)}
                </p>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={handleEdit}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-2">
              <p className="text-sm text-gray-800">{comment.comment || ""}</p>
            </div>

            {comment.blockContent && (
              <div className="text-xs text-gray-600 mb-2 italic">
                <p>"{(comment.blockContent || "").substring(0, 40)}..."</p>
              </div>
            )}
          </div>

          {/* Replies section */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Replies:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {comment.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="pl-2 border-l-2 border-gray-200 mb-2"
                  >
                    <p className="text-xs font-medium text-gray-700">
                      {reply.userName || "Anonymous"}
                    </p>
                    <p className="text-sm text-gray-600">{reply.comment}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(reply.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply input */}
          <div className="p-3">
            <input
              type="text"
              placeholder="Add a reply..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              value={replyText}
              onChange={(e) => {
                console.log(
                  "💬 Reply text changed:",
                  e.target.value.length,
                  "chars"
                );
                setReplyText(e.target.value);
              }}
              onKeyDown={handleSubmitReply}
            />
          </div>
        </div>
      )}
    </div>
  );
}
