"use server";

import { Comment } from "@/app/types";

export async function addComment(pageId: string, comment: Omit<Comment, "id">) {
  const newComment = {
    ...comment,
    id: Date.now().toString(),
  };
  return newComment;
}

export async function updateComment(
  pageId: string,
  commentId: string,
  updates: Partial<Comment>
) {
  // We'll handle updates in the client component
}

export async function deleteComment(pageId: string, commentId: string) {
  // We'll handle deletion in the client component
}
