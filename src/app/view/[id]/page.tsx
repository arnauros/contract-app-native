"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Comments } from "@/app/test/Comments";
import Skeleton from "@/app/Components/Editor/skeleton";
import { CommentsSidebar } from "@/app/Components/CommentsSidebar";

interface Comment {
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

const ContractBlock = ({
  block,
  showComments,
  onClick,
}: {
  block: any;
  showComments: boolean;
  onClick: () => void;
}) => {
  const renderBlockContent = (block: any) => {
    if (!block?.data) {
      console.warn("Invalid block structure:", block);
      return null;
    }

    switch (block.type) {
      case "header":
        return (
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            {block.data.text}
          </h1>
        );
      case "paragraph":
        return (
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {block.data.text}
          </p>
        );
      case "list":
        return (
          <ul className="list-disc ml-6 mb-6 text-gray-700">
            {block.data.items?.map((item: string, index: number) => (
              <li key={index} className="mb-2">
                {item}
              </li>
            ))}
          </ul>
        );
      case "table":
        return (
          <table className="w-full mb-6">
            {/* Add table rendering logic */}
          </table>
        );
      default:
        console.warn(`Unknown block type: ${block.type}`, block);
        return (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <pre className="text-sm">{JSON.stringify(block.data, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        p-3 -mx-3 rounded-lg transition-colors
        ${showComments ? "cursor-pointer hover:bg-blue-50" : ""}
      `}
      onClick={() => showComments && onClick()}
    >
      {renderBlockContent(block)}
    </div>
  );
};

export default function ViewPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const hasInitialized = useRef(false);

  // Load contract and comments
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      const loadContractAndComments = async () => {
        try {
          // Load contract
          const savedContract = localStorage.getItem(`contract-content-${id}`);
          if (savedContract) {
            setGeneratedContent(JSON.parse(savedContract));
          }

          // Load comments
          const savedComments = localStorage.getItem(`contract-comments-${id}`);
          if (savedComments) {
            setComments(JSON.parse(savedComments));
          }

          setIsLoading(false);
        } catch (error) {
          console.error("Error loading data:", error);
          setIsLoading(false);
        }
      };

      loadContractAndComments();
    }
  }, [id]);

  // Save comments whenever they change
  useEffect(() => {
    if (comments.length > 0) {
      localStorage.setItem(`contract-comments-${id}`, JSON.stringify(comments));
    }
  }, [comments, id]);

  const handleAddReply = (commentId: string, replyText: string) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [
              ...(comment.replies || []),
              {
                id: crypto.randomUUID(),
                comment: replyText,
                timestamp: Date.now(),
              },
            ],
          };
        }
        return comment;
      })
    );
  };

  const handleDismissComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, isDismissed: true } : comment
      )
    );
  };

  const handleRestoreComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, isDismissed: false } : comment
      )
    );
  };

  const handleBlockClick = (block: any) => {
    if (!showComments) return;

    // Format the block content properly
    const getBlockContent = (block: any) => {
      if (block.data) {
        if (Array.isArray(block.data.items)) {
          return block.data.items.join("\n");
        }
        if (typeof block.data.text === "string") {
          return block.data.text;
        }
        if (typeof block.data.content === "string") {
          return block.data.content;
        }
      }
      return JSON.stringify(block.data);
    };

    const blockContent = getBlockContent(block);

    // Check for any existing comments (including dismissed ones) for this block
    const existingComment = comments.find((c) => c.blockId === block.id);
    const dismissedComment = comments.find(
      (c) => c.blockId === block.id && c.isDismissed
    );

    // If there's a dismissed comment, restore it instead of creating a new one
    if (dismissedComment) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === dismissedComment.id
            ? { ...c, isDismissed: false, isEditing: true }
            : { ...c, isEditing: false }
        )
      );
      return;
    }

    // Handle normal comment creation/editing
    if (existingComment) {
      if (!existingComment.isEditing) {
        setComments((prev) =>
          prev.map((c) => ({
            ...c,
            isEditing: c.blockId === block.id,
          }))
        );
      }
    } else {
      setComments((prev) => [
        ...prev.map((c) => ({ ...c, isEditing: false })),
        {
          id: crypto.randomUUID(),
          blockId: block.id,
          blockContent,
          comment: null,
          timestamp: Date.now(),
          isEditing: true,
          replies: [],
        },
      ]);
    }
  };

  const handleAddComment = (blockId: string, comment: string) => {
    setComments((prev) =>
      prev.map((c) => (c.blockId === blockId ? { ...c, comment } : c))
    );
  };

  const handleSubmitComment = (blockId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.blockId === blockId) {
          // Only submit if there's actual comment content
          if (c.comment && c.comment.trim()) {
            return {
              ...c,
              isEditing: false, // Mark as no longer editing
              timestamp: Date.now(), // Update timestamp to submission time
            };
          }
        }
        return c;
      })
    );
  };

  const handleEditComment = (blockId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.blockId === blockId ? { ...c, isEditing: true } : c))
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className={`flex ${showComments ? "mr-80" : ""}`}>
        <div className="flex-1 max-w-4xl mx-auto py-8 px-4">
          {/* Topbar */}
          <div className="flex justify-end gap-4 mb-8">
            <button
              onClick={() => setShowComments(!showComments)}
              className={`
                px-6 py-2 text-lg rounded-full transition-colors
                ${showComments ? "bg-blue-600" : "bg-blue-500"} 
                text-white hover:bg-blue-700
              `}
            >
              Request Changes
            </button>
            <button className="px-6 py-2 text-lg bg-blue-500 hover:bg-blue-700 text-white rounded-full transition-colors">
              Sign Contract
            </button>
          </div>

          {/* Document content */}
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-3xl mx-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : generatedContent?.blocks ? (
              generatedContent.blocks.map((block: any) => (
                <ContractBlock
                  key={block.id}
                  block={block}
                  showComments={showComments}
                  onClick={() => handleBlockClick(block)}
                />
              ))
            ) : (
              <div className="text-red-500 p-4 text-center">
                No contract content found
              </div>
            )}
          </div>
        </div>

        {/* Comments sidebar */}
        {showComments && (
          <CommentsSidebar
            comments={comments}
            onAddComment={handleAddComment}
            onSubmitComment={handleSubmitComment}
            onEditComment={handleEditComment}
            onAddReply={handleAddReply}
            onDismissComment={handleDismissComment}
            onRestoreComment={handleRestoreComment}
          />
        )}
      </div>
    </div>
  );
}
