"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Comments } from "@/app/Components/Comments/Comments";
import Skeleton from "@/app/Components/Editor/skeleton";

export default function ViewPage() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const hasInitialized = useRef(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (hasInitialized.current) {
      console.log("🚫 Preventing double initialization");
      return;
    }

    const loadContract = async () => {
      try {
        hasInitialized.current = true;
        console.log("🔄 Loading contract once:", id);

        const savedContract = localStorage.getItem(`contract-content-${id}`);
        if (savedContract) {
          console.log(
            "📄 Found saved contract, loading...",
            JSON.parse(savedContract)
          );
          setGeneratedContent(JSON.parse(savedContract));
        }
      } catch (error) {
        console.error("Loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContract();
  }, [id]);

  console.log("Current generatedContent:", generatedContent);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Skeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Topbar */}
      <div className="flex justify-end gap-4 p-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="px-6 py-2 text-lg bg-blue-500 text-white rounded-full"
        >
          Request Changes
        </button>
        <button className="px-6 py-2 text-lg bg-blue-500 text-white rounded-full">
          Sign Contract
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 relative">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(generatedContent, null, 2)}
          </pre>
        </div>

        {/* Comments layer */}
        {showComments && (
          <div className="absolute inset-0 pointer-events-auto">
            <Comments pageId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
