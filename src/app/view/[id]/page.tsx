"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@liveblocks/client";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react";

const client = createClient({
  publicApiKey:
    "pk_prod_aRjbwUZVgt1LU6WaJXJZahntx1zYDSaDrtfP7jPbs1pETGzUvrIREZPGzoerjwVI",
});

export default function ContractView() {
  const { id } = useParams();
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentingEnabled, setIsCommentingEnabled] = useState(false);

  useEffect(() => {
    const loadContract = () => {
      try {
        const contractData = localStorage.getItem(`contract-${id}`);
        const contentData = localStorage.getItem(`contract-content-${id}`);

        if (contractData && contentData) {
          const parsedContract = JSON.parse(contractData);
          const parsedContent = JSON.parse(contentData);

          setContract({
            ...parsedContract,
            blocks: parsedContent.blocks || [],
          });
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading contract:", error);
        setIsLoading(false);
      }
    };

    loadContract();
  }, [id]);

  if (isLoading) return <div>Loading contract...</div>;
  if (!contract) return <div>Contract not found</div>;

  return (
    <LiveblocksProvider client={client}>
      <RoomProvider
        id={`contract-${id}`}
        initialPresence={{
          cursor: null,
          isTyping: false,
        }}
        initialStorage={{
          comments: [],
          version: 1,
        }}
      >
        <ClientSideSuspense fallback={<div>Loading comments...</div>}>
          {() => (
            <div className="flex flex-col min-h-screen">
              <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 z-10">
                <div className="max-w-7xl mx-auto flex justify-end gap-4">
                  <button
                    onClick={() => setIsCommentingEnabled(!isCommentingEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                      isCommentingEnabled
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {isCommentingEnabled
                      ? "Finish Commenting"
                      : "Request Changes"}
                  </button>
                </div>
              </div>

              <div className="mt-16 px-4 py-8 max-w-7xl mx-auto w-full">
                <div className="prose max-w-none">
                  {contract.blocks?.map((block: any, index: number) => (
                    <div key={index}>{renderBlock(block)}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}

function renderBlock(block: any) {
  switch (block.type) {
    case "header":
      return (
        <h1 className={`text-${block.data.level}xl font-bold my-4`}>
          {block.data.text}
        </h1>
      );
    case "paragraph":
      return <p className="my-2">{block.data.text}</p>;
    case "list":
      return (
        <ul className="list-disc ml-6 my-2">
          {block.data.items.map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
