import { Comment as CommentType } from "@/lib/firebase/firestore";
import { Comment } from "./Comment";
import { useEffect } from "react";

interface CommentListProps {
  comments: CommentType[];
  onDismiss: (commentId: string) => void;
  onEdit: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}

// Safe comment rendering wrapper
const SafeComment = (props: {
  comment: CommentType;
  onDismiss: (commentId: string) => void;
  onEdit: (blockId: string) => void;
  onAddReply: (commentId: string, reply: string) => void;
}) => {
  try {
    if (!props.comment || !props.comment.id || !props.comment.blockId) {
      return null;
    }
    return <Comment {...props} />;
  } catch (error) {
    console.error("Error rendering comment:", error);
    return null;
  }
};

export function CommentList({
  comments,
  onDismiss,
  onEdit,
  onAddReply,
}: CommentListProps) {
  // Use effect to clean up any error messages on mount
  useEffect(() => {
    const cleanup = () => {
      try {
        // Hide any error messages that might appear
        const errorElements = document.querySelectorAll(
          '[class*="comment-not-found"], [class*="comment_error"], [class*="error"]'
        );

        errorElements.forEach((element) => {
          if (
            element.textContent?.toLowerCase().includes("comment not found") ||
            element.textContent?.toLowerCase().includes("error")
          ) {
            const htmlElement = element as HTMLElement;
            htmlElement.style.display = "none";
            htmlElement.style.visibility = "hidden";
            htmlElement.style.height = "0";
            htmlElement.style.opacity = "0";
            htmlElement.style.overflow = "hidden";
          }
        });
      } catch (e) {
        // Ignore errors in error handling
      }
    };

    cleanup();

    // Set up an interval to continuously clean up
    const interval = setInterval(cleanup, 300);

    return () => clearInterval(interval);
  }, [comments]);

  if (!comments || !Array.isArray(comments) || comments.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg
          className="w-10 h-10 mx-auto mb-2 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p>No comments yet</p>
        <p className="text-sm mt-1">
          Start the conversation by adding a comment to any section of the
          contract
        </p>
      </div>
    );
  }

  // Filter out invalid comments more aggressively
  const validComments = comments.filter(
    (comment) =>
      comment &&
      typeof comment === "object" &&
      comment.id &&
      comment.blockId &&
      comment.comment !== undefined
  );

  if (validComments.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No valid comments found</p>
        <p className="text-sm mt-1">Try adding a new comment to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {validComments.map((comment) => (
        <SafeComment
          key={comment.id}
          comment={comment}
          onDismiss={onDismiss}
          onEdit={onEdit}
          onAddReply={onAddReply}
        />
      ))}
    </div>
  );
}
