"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Comments } from "@/app/test/Comments";
import Skeleton from "@/app/Components/Editor/skeleton";

const ContractBlock = ({
  block,
  showComments,
  hoveredBlockId,
  setHoveredBlockId,
}: {
  block: any;
  showComments: boolean;
  hoveredBlockId: string | null;
  setHoveredBlockId: (id: string | null) => void;
}) => {
  console.log("Rendering block:", block.id, "hovered:", hoveredBlockId);

  const renderBlockContent = (block: any) => {
    switch (block.type) {
      case "header":
        const HeaderTag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
        return (
          <HeaderTag
            className={`
            ${
              block.data.level === 1
                ? "text-4xl font-bold text-gray-800 mb-6"
                : ""
            }
            ${
              block.data.level === 2
                ? "text-2xl font-semibold text-gray-700 mb-4"
                : ""
            }
            ${
              block.data.level === 3
                ? "text-xl font-medium text-gray-700 mb-3"
                : ""
            }
          `}
          >
            {block.data.text}
          </HeaderTag>
        );

      case "paragraph":
        return (
          <p className="text-gray-600 mb-4 leading-relaxed">
            {block.data.text}
          </p>
        );

      case "list":
        const ListTag = block.data.style === "ordered" ? "ol" : "ul";
        return (
          <ListTag className="list-disc ml-6 mb-4 text-gray-600">
            {block.data.items.map((item: string, index: number) => (
              <li key={index} className="mb-2">
                {item}
              </li>
            ))}
          </ListTag>
        );

      case "table":
        return (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse border border-gray-200">
              <tbody>
                {block.data.content.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <td
                        key={cellIndex}
                        className="border border-gray-200 p-2"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "quote":
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4">
            {block.data.text}
          </blockquote>
        );

      case "delimiter":
        return <hr className="my-6 border-t border-gray-200" />;

      default:
        console.log("Unhandled block type:", block.type);
        return null;
    }
  };

  return (
    <div
      className={`
        relative
        ${showComments ? "cursor-pointer" : ""}
        ${hoveredBlockId === block.id ? "bg-gray-100" : ""}
        transition-colors
        p-2 -mx-2
        rounded
      `}
      onMouseEnter={() => showComments && setHoveredBlockId(block.id)}
      onMouseLeave={() => showComments && setHoveredBlockId(null)}
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
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  console.log("Current showComments state:", showComments);

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
    <div className="relative min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Topbar */}
        <div className="flex justify-end gap-4 p-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className={`
              px-6 py-2 text-lg rounded-full
              ${showComments ? "bg-blue-600" : "bg-blue-500"} text-white
              relative z-10
            `}
          >
            Request Changes
          </button>
          <button className="px-6 py-2 text-lg bg-blue-500 text-white rounded-full">
            Sign Contract
          </button>
        </div>

        {/* Main content */}
        <div className="bg-white rounded-lg shadow-sm p-6 relative">
          <div className="relative z-0">
            {generatedContent?.blocks.map((block: any) => (
              <ContractBlock
                key={block.id}
                block={block}
                showComments={showComments}
                hoveredBlockId={hoveredBlockId}
                setHoveredBlockId={setHoveredBlockId}
              />
            ))}
          </div>

          {/* Comments overlay */}
          {showComments && (
            <div className="absolute inset-0 z-50 pointer-events-none">
              <div className="pointer-events-auto">
                <Comments />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
