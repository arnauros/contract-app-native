"use client";

import { useState, useEffect, useCallback } from "react";
import { addComment } from "@/app/actions/comments";

type Reaction = {
  emoji: string;
  users: string[]; // For now just count, could add user info later
};

type Reply = {
  id: string;
  text: string;
  createdAt: string;
};

type Comment = {
  id: string;
  text: string;
  position: { x: number; y: number };
  createdAt: string;
  reactions: Reaction[];
  replies: Reply[];
  resolved: boolean;
};

interface CommentsProps {
  pageId: string;
}

export function Comments({ pageId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newReply, setNewReply] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState<string | null>(null);

  // Load comments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("comments");
    if (saved) setComments(JSON.parse(saved));
  }, []);

  // Save to localStorage when updated
  useEffect(() => {
    localStorage.setItem("comments", JSON.stringify(comments));
  }, [comments]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredComment !== null || isTyping) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsAdding(true);
    setIsTyping(true); // Set typing state when starting new comment
  };

  const handleMouseEnter = (commentId: string) => {
    if (isTyping) return; // Don't change hover state if typing
    setHoveredComment(commentId);
  };

  const handleMouseLeave = () => {
    if (isTyping) return; // Don't remove hover state if typing
    setTimeout(() => {
      if (!isTyping) {
        setHoveredComment(null);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      setIsAdding(false);
      setIsTyping(false);
      return;
    }

    const comment = {
      text: newComment,
      position,
      createdAt: new Date().toISOString(),
      reactions: [],
      replies: [],
      resolved: false,
    };

    const newComment = await addComment(pageId, comment);
    setComments([...comments, newComment]);
    setNewComment("");
    setIsAdding(false);
    setIsTyping(false);
  };

  const addReaction = (commentId: string, emoji: string) => {
    setComments(
      comments.map((comment) => {
        if (comment.id !== commentId) return comment;

        const existingReaction = comment.reactions.find(
          (r) => r.emoji === emoji
        );
        if (existingReaction) {
          // Toggle reaction
          return {
            ...comment,
            reactions: comment.reactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      users: r.users.includes("user")
                        ? r.users.filter((u) => u !== "user")
                        : [...r.users, "user"],
                    }
                  : r
              )
              .filter((r) => r.users.length > 0), // Remove reactions with no users
          };
        }

        // Add new reaction
        return {
          ...comment,
          reactions: [...comment.reactions, { emoji, users: ["user"] }],
        };
      })
    );
  };

  const addReply = (commentId: string) => {
    if (!newReply.trim()) return;

    setComments(
      comments.map((comment) => {
        if (comment.id !== commentId) return comment;
        return {
          ...comment,
          replies: comment.replies
            ? [
                ...comment.replies,
                {
                  id: Date.now().toString(),
                  text: newReply,
                  createdAt: new Date().toISOString(),
                },
              ]
            : [
                {
                  id: Date.now().toString(),
                  text: newReply,
                  createdAt: new Date().toISOString(),
                },
              ],
        };
      })
    );
    setNewReply("");
    setReplyingTo(null);
  };

  const toggleResolved = (commentId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, resolved: !comment.resolved }
          : comment
      )
    );
  };

  const handlePinClick = (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentOpen(isCommentOpen === commentId ? null : commentId);
  };

  const deleteComment = (commentId: string) => {
    setComments(comments.filter((comment) => comment.id !== commentId));
    setIsCommentOpen(null);
  };

  return (
    <div className="p-8">
      <div
        className="min-h-[400px] border border-dashed border-gray-300 rounded p-4 relative cursor-crosshair"
        onClick={handleClick}
      >
        {/* Adding New Comment Preview */}
        {isAdding && (
          <div
            className="absolute flex items-start gap-2"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: "translate(-24px, -50%)",
              zIndex: 2000,
            }}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <textarea
                autoFocus
                className="w-full px-4 pt-3 border-0 focus:ring-0 text-sm resize-none"
                placeholder="Add comment..."
                rows={1}
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  setIsTyping(true);
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center px-4 py-2 border-t border-gray-100">
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600">
                    <span role="img" aria-label="emoji">
                      😊
                    </span>
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600">
                    <span role="img" aria-label="mention">
                      @
                    </span>
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600">
                    <span role="img" aria-label="image">
                      🖼️
                    </span>
                  </button>
                </div>
                <button
                  className="ml-auto p-1.5 bg-blue-500 text-white rounded-md text-sm px-3
                            hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={!newComment.trim()}
                  onClick={handleSubmit}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing Comments */}
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="absolute"
            style={{
              left: `${comment.position.x}px`,
              top: `${comment.position.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Comment Pin */}
            <div
              className="w-8 h-8 rounded-full bg-blue-500 cursor-pointer
                         transition-transform duration-150 hover:scale-110
                         flex items-center justify-center"
              onClick={(e) => handlePinClick(comment.id, e)}
              onMouseEnter={() =>
                !isCommentOpen && setHoveredComment(comment.id)
              }
              onMouseLeave={() => !isCommentOpen && setHoveredComment(null)}
            />

            {/* Hover Preview */}
            {hoveredComment === comment.id && !isCommentOpen && (
              <div
                className="absolute left-10 top-0 bg-white rounded-xl shadow-lg py-2 px-3
                             transform -translate-y-1/2 z-50 min-w-[200px]"
              >
                <div className="text-sm">{comment.text}</div>
              </div>
            )}

            {/* Full Comment Thread */}
            {isCommentOpen === comment.id && (
              <div
                className="absolute left-10 top-0 bg-white rounded-xl shadow-lg
                             transform -translate-y-1/2 z-50 min-w-[320px]"
              >
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="text-sm">{comment.text}</div>
                    <div className="flex gap-1 ml-4">
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setIsCommentOpen(null)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="space-y-2 mt-3">
                    {comment.replies?.map((reply) => (
                      <div
                        key={reply.id}
                        className="text-sm bg-gray-50 rounded-md p-2"
                      >
                        {reply.text}
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id ? (
                    <div className="mt-3">
                      <input
                        autoFocus
                        className="w-full px-3 py-1.5 text-sm border rounded-md
                                 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Reply..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addReply(comment.id)
                        }
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-sm text-blue-500 mt-3 hover:text-blue-600"
                    >
                      Reply...
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
