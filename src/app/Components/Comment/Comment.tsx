import { useState, useEffect } from "react";
import { XMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Comment as CommentType } from "@/lib/firebase/firestore";
import { formatDate } from "@/lib/utils";

interface CommentProps {
  comment: CommentType;
  onDismiss: (commentId: string) => void;
  onEdit: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}

export function Comment({
  comment,
  onDismiss,
  onEdit,
  onAddReply,
}: CommentProps) {
  const [replyText, setReplyText] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  // Safety effect to hide component if invalid props are passed
  useEffect(() => {
    // Safety check - if comment is invalid, make it not visible
    if (!comment || !comment.id || !comment.blockId) {
      setIsVisible(false);
    }
  }, [comment]);

  // If comment is invalid, render nothing
  if (!isVisible || !comment || !comment.id || !comment.blockId) {
    return null;
  }

  const handleAddReply = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && replyText.trim()) {
      try {
        onAddReply(comment.id as string, replyText);
        setReplyText("");
      } catch (error) {
        console.error("Error adding reply:", error);
      }
    }
  };

  // Use try-catch for rendering to prevent crashes
  try {
    return (
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {comment.userName || "Anonymous"}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(comment.timestamp)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(comment.blockId)}
              className="text-gray-400 hover:text-gray-600"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                try {
                  onDismiss(comment.id as string);
                } catch (error) {
                  console.error("Error dismissing comment:", error);
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mb-2">
          <p className="text-sm text-gray-800">{comment.comment || ""}</p>
        </div>
        <div className="text-xs text-gray-600 mb-2">
          <p>On: "{(comment.blockContent || "").substring(0, 40)}..."</p>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-500">Replies:</p>
            {comment.replies.map((reply) => (
              <div key={reply.id} className="pl-3 border-l-2 border-gray-200">
                <p className="text-xs font-medium">
                  {reply.userName || "Anonymous"}
                </p>
                <p className="text-sm text-gray-600">{reply.comment || ""}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(reply.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Reply form */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Add a reply..."
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleAddReply}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering comment:", error);
    return null;
  }
}
