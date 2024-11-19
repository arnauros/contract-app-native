"use client";

import { useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread } from "@liveblocks/react-ui";

export function CommentsPanel() {
  const { threads } = useThreads();

  return (
    <div className="fixed right-0 top-0 h-screen w-[400px] bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Contract Comments</h2>
        <p className="text-sm text-gray-500">
          Request changes or ask questions
        </p>
      </div>

      <div className="space-y-4">
        {threads.map((thread) => (
          <Thread key={thread.id} thread={thread} />
        ))}
      </div>

      <div className="sticky bottom-0 bg-white pt-4">
        <Composer />
      </div>
    </div>
  );
}
