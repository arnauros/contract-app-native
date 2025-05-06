"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Modal from "@/app/Components/Modal";
import { toast } from "react-hot-toast";
import { FiMenu } from "react-icons/fi";
import { useSidebar } from "@/lib/context/SidebarContext";
import { getSignatures } from "@/lib/firebase/firestore";
import UsersDisplay from "@/app/Components/UsersDisplay";
import useActiveUsers from "@/lib/hooks/useActiveUsers";

interface TopbarProps {
  pathname: string;
}

export default function Topbar({ pathname }: TopbarProps) {
  const { toggleSidebar } = useSidebar();
  const params = useParams();
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    "edit"
  );

  // Get active users for current contract
  const contractId = params?.id as string;
  const { activeUsers } = useActiveUsers(contractId);

  // Simple stage management with debounce and content check
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleStageChange = (e: CustomEvent) => {
      const newStage = e.detail;
      const contractId = window.location.pathname.split("/").pop();

      // Clear any pending stage changes
      clearTimeout(timeoutId);

      // Debounce stage changes to prevent rapid transitions
      timeoutId = setTimeout(() => {
        if (contractId) {
          // Check for contract content
          const savedContent = localStorage.getItem(
            `contract-content-${contractId}`
          );
          const hasContent =
            savedContent && JSON.parse(savedContent).blocks?.length > 0;

          // Only allow non-edit stages if we have content
          if (!hasContent && newStage !== "edit") {
            toast.error("Please create your contract before proceeding");
            const event = new CustomEvent("stageChange", { detail: "edit" });
            window.dispatchEvent(event);
            return;
          }
        }

        console.log("🎭 Stage change:", newStage);
        setCurrentStage(newStage);
      }, 100);
    };

    window.addEventListener("stageChange", handleStageChange as EventListener);
    return () => {
      window.removeEventListener(
        "stageChange",
        handleStageChange as EventListener
      );
      clearTimeout(timeoutId);
    };
  }, []);

  // Simple navigation rules with debounce
  const handleBackClick = () => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Prevent rapid clicks
    if (currentStage === "send") {
      // Going from send to sign is always allowed
      const event = new CustomEvent("stageChange", { detail: "sign" });
      window.dispatchEvent(event);
    } else if (currentStage === "sign") {
      // Going from sign to edit - let the ContractEditor handle this
      const event = new CustomEvent("stageChange", { detail: "edit" });
      window.dispatchEvent(event);
    }
  };

  const handleNext = async () => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Check for contract content first
    const savedContent = localStorage.getItem(`contract-content-${contractId}`);
    const hasContent =
      savedContent && JSON.parse(savedContent).blocks?.length > 0;

    if (!hasContent) {
      toast.error("Please create your contract before proceeding");
      return;
    }

    if (currentStage === "sign") {
      try {
        // Check both localStorage and Firestore for signatures
        const localSignature = localStorage.getItem(
          `contract-designer-signature-${contractId}`
        );
        const firestoreSignatures = await getSignatures(contractId);

        const hasSignature =
          localSignature ||
          (firestoreSignatures.success &&
            firestoreSignatures.signatures.designer);

        if (!hasSignature) {
          toast.error("Please sign the contract before proceeding");
          return;
        }
      } catch (error) {
        console.error("Error checking signatures:", error);
        toast.error("Error verifying signature status");
        return;
      }
    }

    // Simple forward progression
    const nextStage = currentStage === "edit" ? "sign" : "send";
    const event = new CustomEvent("stageChange", { detail: nextStage });
    window.dispatchEvent(event);
  };

  // Get breadcrumb text
  const getBreadcrumb = () => {
    if (pathname.startsWith("/Contracts/") && params?.id) {
      return `Dashboard / Contracts / #${params.id}`;
    }
    if (pathname === "/new") {
      return "Dashboard / Contracts / New Contract";
    }
    return "Dashboard / Contracts";
  };

  const isContractPage = pathname.startsWith("/Contracts/") && params?.id;

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-4">
          {isContractPage && (
            <span className="text-gray-500 text-sm">{getBreadcrumb()}</span>
          )}
        </div>
        <div className="flex-1 flex justify-center">
          {isContractPage && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center h-10 justify-center gap-2 px-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div
                  className={`flex items-center gap-3 h-8 px-1 ${
                    currentStage === "edit"
                      ? "bg-[#E5FFE7] border border-gray-100 rounded-md"
                      : ""
                  }`}
                >
                  <span className="flex items-center justify-center w-6 h-6 bg-white rounded-md text-sm font-medium shadow-sm">
                    1
                  </span>
                  <span className="text-sm font-medium pr-2">Draft & Edit</span>
                </div>
                <div
                  className={`flex items-center gap-3 h-8 px-1 ${
                    currentStage === "sign"
                      ? "bg-[#E5FFE7] border border-gray-100 rounded-md"
                      : ""
                  }`}
                >
                  <span className="flex items-center justify-center w-6 h-6 bg-white rounded-lg text-sm font-medium shadow-sm">
                    2
                  </span>
                  <span className="text-sm font-medium">Sign</span>
                </div>
                <div
                  className={`flex items-center gap-3 h-8 px-1 ${
                    currentStage === "send"
                      ? "bg-[#E5FFE7] border border-gray-100 rounded-md"
                      : ""
                  }`}
                >
                  <span className="flex items-center justify-center w-6 h-6 bg-white rounded-lg text-sm font-medium shadow-sm">
                    3
                  </span>
                  <span className="text-sm font-medium">Send</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Active Users Display */}
          {isContractPage && activeUsers.length > 0 && (
            <div className="mr-2">
              <UsersDisplay users={activeUsers} />
            </div>
          )}

          {/* Navigation Controls */}
          {isContractPage && (
            <div className="flex gap-2">
              {currentStage !== "edit" && (
                <button
                  onClick={handleBackClick}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              {currentStage !== "send" && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-black text-white rounded-md"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
