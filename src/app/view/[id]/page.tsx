"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Comments } from "@/app/test/Comments";
import Skeleton from "@/app/Components/Editor/skeleton";
import { CommentsSidebar } from "@/app/Components/CommentsSidebar";
import Button from "@/app/Components/button";
import {
  CheckIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { SigningStage } from "@/app/Components/Editor/SigningStage";

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
  const router = useRouter();
  const [isSigning, setIsSigning] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

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

  const handleSignContract = () => {
    setShowSignatureModal(true);
  };

  const handleSignComplete = async (signature: string, name: string) => {
    try {
      // Save signature data
      localStorage.setItem(
        `contract-signature-${id}`,
        JSON.stringify({ signature, name })
      );

      toast.success("Contract signed successfully!");
      setShowSignatureModal(false);
      router.push(`/contract/signed/${id}`);
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Failed to sign contract. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      {/* Fixed Topbar */}
      <div className="fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-200">
        <div className="h-14 flex items-center justify-end px-4">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowComments(!showComments);
                if (showComments && comments.length > 0) {
                  toast.success(
                    "The Designer will be notified of your review",
                    {
                      duration: 4000,
                      position: "bottom-center",
                      className: "bg-gray-900 text-white",
                    }
                  );
                }
              }}
              variant="secondary"
              className="inline-flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-800"
            >
              {showComments ? (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Done Reviewing
                </>
              ) : (
                <>
                  <PencilSquareIcon className="w-5 h-5" />
                  Request Changes
                </>
              )}
            </Button>

            <Button
              variant="primary"
              className="inline-flex items-center gap-2"
              disabled={showComments || comments.length > 0 || isSigning}
              onClick={handleSignContract}
            >
              {isSigning ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              )}
              {isSigning ? "Signing..." : "Sign Contract"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Now full width */}
      <div className="pt-14">
        <div className="max-w-[640px] mx-auto pt-[100px]">
          <div className="bg-white rounded-lg shadow-sm p-8">
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
      </div>

      {/* Comments Sidebar */}
      {showComments && (
        <div className="fixed top-0 right-0 bottom-0 w-[320px] bg-white border-l border-gray-200 shadow-lg z-10">
          <div className="absolute top-14 left-0 right-0 bottom-0">
            <CommentsSidebar
              comments={comments}
              onAddComment={handleAddComment}
              onSubmitComment={handleSubmitComment}
              onEditComment={handleEditComment}
              onAddReply={handleAddReply}
              onDismissComment={handleDismissComment}
              onRestoreComment={handleRestoreComment}
            />
          </div>
        </div>
      )}

      <SigningStage
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSign={handleSignComplete}
      />
    </div>
  );
}
