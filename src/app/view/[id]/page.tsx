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
import { CheckIcon as CheckIconSolid } from "@heroicons/react/20/solid";
import SignaturePad from "react-signature-canvas";
import Modal from "@/app/Components/Modal";

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
  const [contractState, setContractState] = useState({
    isClientSigned: false,
    existingSignature: false,
    clientName: "",
    clientSignature: "",
    clientSignedAt: null,
    designerName: "",
    designerSignature: "",
    designerSignedAt: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [signatureState, setSignatureState] = useState({
    designerSignature: "",
    designerName: "",
    designerSignedAt: null,
    isLoading: true,
  });
  const signaturePadRef = useRef<any>(null);
  const [isClientSigned, setIsClientSigned] = useState(false);
  const [isUnsignModalOpen, setIsUnsignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load contract and comments
  useEffect(() => {
    if (id) {
      const loadContractAndComments = () => {
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

  // Load signatures once on mount
  useEffect(() => {
    const loadSignatures = () => {
      try {
        const storageKey = `contract-designer-signature-${id}`;
        const savedData = localStorage.getItem(storageKey);
        console.log("🔍 Loading signature data:", {
          key: storageKey,
          data: savedData,
        });

        if (savedData) {
          const data = JSON.parse(savedData);
          setSignatureState({
            designerSignature: data.signature,
            designerName: data.name,
            designerSignedAt: new Date(data.signedAt),
            isLoading: false,
          });
        } else {
          setSignatureState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error loading signature:", error);
        setSignatureState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadSignatures();
  }, [id]);

  // Check for existing signatures on load
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    const clientSignature = localStorage.getItem(
      `contract-client-signature-${contractId}`
    );
    console.log("🔍 Checking for client signature:", clientSignature);

    if (clientSignature) {
      const signatureData = JSON.parse(clientSignature);
      setContractState((prev) => ({
        ...prev,
        clientSignature: signatureData.signature,
        clientName: signatureData.name,
        clientSignedAt: new Date(signatureData.signedAt),
        isClientSigned: true,
      }));
      setIsClientSigned(true);
    }
  }, []);

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
    console.log("🖊️ Sign Contract clicked");
    setShowSignatureModal(true);
  };

  const handleSignComplete = async (signature: string, name: string) => {
    console.log("✅ handleSignComplete called with:", { signature, name });
    try {
      const contractId = window.location.pathname.split("/").pop();
      const signatureData = {
        signature,
        name,
        signedAt: new Date().toISOString(),
      };

      // Save signature data
      localStorage.setItem(
        `contract-client-signature-${contractId}`,
        JSON.stringify(signatureData)
      );

      setContractState((prev) => ({
        ...prev,
        clientSignature: signature,
        clientName: name,
        clientSignedAt: new Date(),
        isClientSigned: true,
      }));
      setIsClientSigned(true);
      setShowSignatureModal(false);

      toast.success("Contract signed successfully!");
    } catch (error) {
      console.error("❌ Error signing contract:", error);
      toast.error("Failed to sign contract. Please try again.");
    }
  };

  const handleUnsignContract = () => {
    setIsUnsignModalOpen(true);
  };

  const confirmUnsignContract = () => {
    console.log("🗑️ Unsign Contract confirmed");
    try {
      const contractId = window.location.pathname.split("/").pop();

      // Remove signature from localStorage
      localStorage.removeItem(`contract-client-signature-${contractId}`);

      // Reset contract state
      setContractState((prev) => ({
        ...prev,
        clientSignature: "",
        clientName: "",
        clientSignedAt: null,
        isClientSigned: false,
      }));
      setIsClientSigned(false);

      toast.success("Signature removed successfully");
    } catch (error) {
      console.error("❌ Error removing signature:", error);
      toast.error("Failed to remove signature. Please try again.");
    } finally {
      setIsUnsignModalOpen(false);
    }
  };

  const handleFinalSign = async () => {
    console.log("✅ handleFinalSign called");
    try {
      const signatureData = {
        signature: contractState.designerSignature,
        name: contractState.designerName,
        signedAt: new Date().toISOString(),
      };

      console.log("📝 Saving designer signature:", signatureData);

      await Promise.all([
        // Save designer signature
        localStorage.setItem(
          `contract-designer-signature-${id}`,
          JSON.stringify(signatureData)
        ),
        // Update contract status
        localStorage.setItem(`contract-status-${id}`, "signed"),
      ]);

      setContractState((prev) => ({
        ...prev,
        existingSignature: true,
        isEditing: false,
      }));

      console.log("✨ Contract signed successfully");
      toast.success("Contract signed successfully!");
    } catch (error) {
      console.error("❌ Error signing contract:", error);
      toast.error("Failed to sign contract");
    }
  };

  const handleDesignerSign = (signature: string, name: string) => {
    setContractState((prev) => ({
      ...prev,
      designerSignature: signature,
      designerName: name,
    }));
    handleFinalSign();
  };

  const handleEditMode = () => {
    if (contractState.isClientSigned || contractState.existingSignature) {
      setIsEditModalOpen(true);
    } else {
      setIsEditing(true);
    }
  };

  const confirmEdit = () => {
    // Clear signatures and status
    localStorage.removeItem(`contract-client-signature-${id}`);
    localStorage.removeItem(`contract-designer-signature-${id}`);
    localStorage.removeItem(`contract-status-${id}`);

    // Reset states
    setContractState({
      isClientSigned: false,
      existingSignature: false,
      clientName: "",
      clientSignature: "",
      clientSignedAt: null,
      designerName: "",
      designerSignature: "",
      designerSignedAt: null,
    });

    setIsEditing(true);
    setIsEditModalOpen(false);
  };

  const SignatureDisplay = () => {
    if (signatureState.isLoading) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            {/* Designer Signature */}
            {signatureState.designerSignature && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    Designer Signature
                  </p>
                  <p className="text-gray-500">{signatureState.designerName}</p>
                  {signatureState.designerSignedAt && (
                    <p className="text-gray-400 text-xs">
                      {signatureState.designerSignedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <img
                  src={signatureState.designerSignature}
                  alt="Designer Signature"
                  className="h-16 border-b border-gray-300"
                />
              </div>
            )}

            {/* Client Signature */}
            {contractState.clientSignature && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Client Signature</p>
                  <p className="text-gray-500">{contractState.clientName}</p>
                  {contractState.clientSignedAt && (
                    <p className="text-gray-400 text-xs">
                      {contractState.clientSignedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <img
                  src={contractState.clientSignature}
                  alt="Client Signature"
                  className="h-16 border-b border-gray-300"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-white">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Fixed Topbar */}
          <div className="fixed top-0 left-0 right-0 bg-white z-20 border-b border-gray-200">
            <div className="h-14 flex items-center justify-end px-4">
              <div className="flex gap-2">
                {false && (
                  <Button
                    onClick={() => setShowComments(!showComments)}
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
                )}

                {!isClientSigned ? (
                  <Button
                    variant="primary"
                    className="inline-flex items-center gap-2"
                    disabled={showComments || comments.length > 0}
                    onClick={handleSignContract}
                  >
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
                    Sign Contract
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="inline-flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleUnsignContract}
                  >
                    <XMarkIcon className="w-5 h-5" />
                    Unsign Contract
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Signatures Display */}
          {(contractState.isClientSigned || contractState.existingSignature) &&
            !isEditing && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <div className="flex items-center gap-8">
                    {/* Designer Signature */}
                    {contractState.existingSignature && (
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            Designer Signature
                          </p>
                          <p className="text-gray-500">
                            {contractState.designerName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {contractState.designerSignedAt?.toLocaleDateString()}{" "}
                            at{" "}
                            {contractState.designerSignedAt?.toLocaleTimeString()}
                          </p>
                        </div>
                        <img
                          src={contractState.designerSignature}
                          alt="Designer Signature"
                          className="h-16 border-b border-gray-300"
                        />
                      </div>
                    )}

                    {/* Client Signature */}
                    {contractState.isClientSigned && (
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            Client Signature
                          </p>
                          <p className="text-gray-500">
                            {contractState.clientName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {contractState.clientSignedAt?.toLocaleDateString()}{" "}
                            at{" "}
                            {contractState.clientSignedAt?.toLocaleTimeString()}
                          </p>
                        </div>
                        <img
                          src={contractState.clientSignature}
                          alt="Client Signature"
                          className="h-16 border-b border-gray-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          {/* Main Content - Now full width */}
          <div className="pt-14">
            <div className="max-w-[900px] mx-auto pt-[100px]">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
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

          {/* Client signing modal */}
          {showSignatureModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-[400px]">
                {contractState.isClientSigned ? (
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                      <CheckIconSolid className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Contract Signed!
                    </h2>
                    <p className="text-gray-600">
                      Thank you, {contractState.clientName}. Your signature has
                      been recorded.
                    </p>
                    <p className="text-sm text-gray-500">
                      Redirecting to confirmation page...
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold mb-4">
                      Sign Contract
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={contractState.clientName}
                          onChange={(e) =>
                            setContractState((prev) => ({
                              ...prev,
                              clientName: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Type your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Signature
                        </label>
                        <SignaturePad
                          ref={signaturePadRef}
                          canvasProps={{
                            className:
                              "w-full h-40 border border-gray-300 rounded-md",
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => signaturePadRef.current?.clear()}
                          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => {
                            if (
                              contractState.clientName.trim() &&
                              signaturePadRef.current
                            ) {
                              const signature =
                                signaturePadRef.current.toDataURL();
                              handleSignComplete(
                                signature,
                                contractState.clientName
                              );
                            }
                          }}
                          disabled={!contractState.clientName.trim()}
                          className={`flex-1 px-4 py-2 text-sm text-white rounded-md ${
                            contractState.clientName.trim()
                              ? "bg-blue-600 hover:bg-blue-700"
                              : "bg-blue-300 cursor-not-allowed"
                          }`}
                        >
                          Sign Contract
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Designer Signature - Always show if it exists */}
          {contractState.designerSignature && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        Designer Signature
                      </p>
                      <p className="text-gray-500">
                        {contractState.designerName}
                      </p>
                      {contractState.designerSignedAt && (
                        <p className="text-gray-400 text-xs">
                          {new Date(
                            contractState.designerSignedAt
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <img
                      src={contractState.designerSignature}
                      alt="Designer Signature"
                      className="h-16 border-b border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <SignatureDisplay />

          <Modal
            isOpen={isUnsignModalOpen}
            onClose={() => setIsUnsignModalOpen(false)}
            title="Unsign Contract"
            onConfirm={confirmUnsignContract}
          >
            <p>
              Are you sure you want to remove your signature from this contract?
            </p>
          </Modal>

          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title="Edit Signed Contract"
            onConfirm={confirmEdit}
            confirmText="Continue"
          >
            <p>
              Editing the contract will invalidate the current signatures. You
              will need to sign the contract again. Do you want to continue?
            </p>
          </Modal>
        </>
      )}
    </div>
  );
}
