import { useRef, useEffect, useState } from "react";

interface Comment {
  id: string;
  blockId: string;
  blockContent: string;
  comment: string | null;
  timestamp: number;
  isEditing?: boolean;
  replies?: Reply[];
  isDismissed?: boolean;
}

interface Reply {
  id: string;
  comment: string;
  timestamp: number;
  isEditing?: boolean;
}

interface CommentsSidebarProps {
  comments: Comment[];
  onAddComment: (blockId: string, comment: string) => void;
  onSubmitComment: (blockId: string) => void;
  onEditComment: (blockId: string) => void;
  onAddReply: (commentId: string, replyText: string) => void;
  onDismissComment: (commentId: string) => void;
  onRestoreComment: (commentId: string) => void;
}

// Add a helper function to format block content
const formatBlockContent = (content: string) => {
  try {
    // Check if the content is JSON
    if (content.startsWith("{")) {
      const parsed = JSON.parse(content);

      // Handle list items
      if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items.join("\n");
      }

      // Handle text content
      if (parsed.text) {
        return parsed.text;
      }

      // Handle other block types
      if (parsed.content) {
        return parsed.content;
      }
    }

    // If not JSON or parsing fails, return original content
    return content;
  } catch (e) {
    return content;
  }
};

export const CommentsSidebar = ({
  comments,
  onAddComment,
  onSubmitComment,
  onEditComment,
  onAddReply,
  onDismissComment,
  onRestoreComment,
}: CommentsSidebarProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeComment = comments.find((c) => c.isEditing);
  const submittedComments = comments.filter(
    (c) => !c.isEditing && c.comment && !c.isDismissed
  );
  const dismissedComments = comments.filter((c) => c.isDismissed);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const isSelectingText = comments.some((c) => c.isEditing);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const formatTimestamp = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Comments</h2>
      </div>

      {/* Comments List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {submittedComments.length === 0 ? (
          <div className="text-center py-6">
            {isSelectingText ? (
              <p className="text-gray-500">Add your first comment below</p>
            ) : (
              <>
                <p className="text-gray-700 font-medium mb-2">
                  Select text to comment
                </p>
                <p className="text-gray-500 text-sm">
                  Click any part of the contract to add comments or suggest
                  changes
                </p>
              </>
            )}
          </div>
        ) : (
          submittedComments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-gray-500">
                  {formatTimestamp(comment.timestamp)}
                </div>
                <button
                  onClick={() => onDismissComment(comment.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Dismiss</span>✕
                </button>
              </div>

              <div className="text-sm text-gray-600 mb-2 border-l-2 border-gray-300 pl-2">
                "{formatBlockContent(comment.blockContent)}"
              </div>

              <p className="text-gray-700 mb-2">{comment.comment}</p>

              <div className="space-x-2">
                <button
                  onClick={() => onEditComment(comment.blockId)}
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="text-blue-500 hover:text-blue-600 text-sm"
                >
                  Reply
                </button>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-4 mt-2 space-y-2">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-white rounded p-2 text-sm"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {formatTimestamp(reply.timestamp)}
                      </div>
                      <p>{reply.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="mt-2">
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end space-x-2 mt-1">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onAddReply(comment.id, replyText);
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Section - Fixed at bottom */}
      {activeComment && (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Selected Text:
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              "{formatBlockContent(activeComment.blockContent)}"
            </div>
          </div>
          <textarea
            className="w-full border rounded-lg p-3 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type your comment..."
            rows={3}
            value={activeComment.comment || ""}
            onChange={(e) =>
              onAddComment(activeComment.blockId, e.target.value)
            }
          />
          <button
            onClick={() => {
              if (activeComment.comment?.trim()) {
                onSubmitComment(activeComment.blockId);
              }
            }}
            disabled={!activeComment.comment?.trim()}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              activeComment.comment?.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Comment
          </button>
        </div>
      )}

      {/* Dismissed Comments Section */}
      {dismissedComments.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <details className="text-sm">
            <summary className="text-gray-500 cursor-pointer">
              Dismissed Comments ({dismissedComments.length})
            </summary>
            <div className="mt-2 space-y-2">
              {dismissedComments.map((comment) => (
                <div key={comment.id} className="rounded bg-gray-100 p-2">
                  <p className="text-gray-600">{comment.comment}</p>
                  <button
                    onClick={() => onRestoreComment(comment.id)}
                    className="text-blue-500 text-xs mt-1"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
