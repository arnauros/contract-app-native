"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Modal from "@/app/Components/Modal";
import { toast } from "react-hot-toast";
import { FiMenu } from "react-icons/fi";
import { useSidebar } from "@/lib/context/SidebarContext";
import { getSignatures } from "@/lib/firebase/firestore";
import UsersDisplay from "@/app/Components/UsersDisplay";
import useActiveUsers from "@/lib/hooks/useActiveUsers";
import { useAuth } from "@/lib/hooks/useAuth";

interface TopbarProps {
  pathname: string;
}

export default function Topbar({ pathname }: TopbarProps) {
  const { toggleSidebar } = useSidebar();
  const params = useParams();
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    "edit"
  );
  const [previousStage, setPreviousStage] = useState<
    "edit" | "sign" | "send" | null
  >(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { loggedIn } = useAuth();

  // Get active users for current contract
  const contractId = params?.id as string;
  const { activeUsers } = useActiveUsers(contractId);

  // Initialize stage from localStorage on load
  useEffect(() => {
    const contractId = params?.id;
    if (contractId && pathname.includes("/Contracts/")) {
      const savedStage = localStorage.getItem(`contract-stage-${contractId}`);
      if (
        savedStage &&
        (savedStage === "edit" ||
          savedStage === "sign" ||
          savedStage === "send")
      ) {
        console.log("🎭 Initializing stage from localStorage:", savedStage);
        setCurrentStage(savedStage as "edit" | "sign" | "send");
      }
    }
  }, [pathname, params?.id]);

  // Memoize handleStageChange to prevent recreating it on each render
  const handleStageChange = useCallback(
    (e: CustomEvent) => {
      // Support both string and object detail formats for better compatibility
      const newStage =
        typeof e.detail === "string" ? e.detail : e.detail?.stage;

      if (
        !newStage ||
        (newStage !== "edit" && newStage !== "sign" && newStage !== "send")
      ) {
        console.log("🎭 Invalid stage received:", newStage);
        return;
      }

      const contractId = window.location.pathname.split("/").pop();

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

      // Save the previous stage before updating
      setPreviousStage(currentStage);

      // Set transition flag
      setIsTransitioning(true);

      console.log("🎭 Stage change:", newStage);
      setCurrentStage(newStage as "edit" | "sign" | "send");

      // Also save the current stage to localStorage for persistence
      if (contractId) {
        localStorage.setItem(`contract-stage-${contractId}`, newStage);
      }

      // Reset transition flag after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Match the duration of your transition
    },
    [currentStage]
  );

  // Simple stage management with debounce and content check
  useEffect(() => {
    window.addEventListener("stageChange", handleStageChange as EventListener);
    return () => {
      window.removeEventListener(
        "stageChange",
        handleStageChange as EventListener
      );
    };
  }, [handleStageChange]);

  // Navigation rules with signature checking
  const handleBackClick = async () => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Handle navigation based on current stage
    if (currentStage === "send") {
      // Going from send to sign is always allowed
      const event = new CustomEvent("stageChange", { detail: "sign" });
      window.dispatchEvent(event);
    } else if (currentStage === "sign") {
      // Check for designer signature before going from sign to edit
      try {
        // Check both localStorage and Firestore for signatures
        const localSignature = localStorage.getItem(
          `contract-designer-signature-${contractId}`
        );

        // Check if we have a designer signature
        let hasDesignerSignature = !!localSignature;

        // Also check Firestore if needed
        if (!hasDesignerSignature && contractId) {
          try {
            const firestoreSignatures = await getSignatures(contractId);
            if (firestoreSignatures.success) {
              hasDesignerSignature = !!firestoreSignatures.signatures.designer;
            }
          } catch (error) {
            console.error("Error fetching signatures:", error);
          }
        }

        // If designer has signed, send special event to trigger unsign modal
        if (hasDesignerSignature) {
          console.log("Designer signature present, need confirmation to edit");
          const event = new CustomEvent("requestUnsignPrompt", {
            detail: { source: "topbar-back" },
          });
          window.dispatchEvent(event);
        } else {
          // No signature, can safely go to edit mode
          const event = new CustomEvent("stageChange", { detail: "edit" });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error checking signatures:", error);
        // Default to normal behavior if there's an error
        const event = new CustomEvent("stageChange", { detail: "edit" });
        window.dispatchEvent(event);
      }
    }
  };

  // Only try to get signatures on the contract page and when contractId exists
  const handleNext = async () => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // Check for authentication first
    if (!loggedIn) {
      // Redirect to login, saving the return path
      window.location.href = `/login?returnUrl=${encodeURIComponent(
        window.location.pathname
      )}`;
      return;
    }

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

        // Check if we have a signature
        let hasDesignerSignature = !!localSignature;

        // Only try to get signatures from Firestore if we don't have a local one
        // and we're on a contract page
        if (
          !hasDesignerSignature &&
          contractId &&
          pathname.includes("/Contracts/")
        ) {
          try {
            const firestoreSignatures = await getSignatures(contractId);
            // Make sure success is defined before checking signatures
            if (firestoreSignatures.success) {
              hasDesignerSignature = !!firestoreSignatures.signatures.designer;
            }
          } catch (error) {
            console.error("Error fetching signatures:", error);
            // Continue with just the local signature check
          }
        }

        if (!hasDesignerSignature) {
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

  // Helper function to get stage index
  const getStageIndex = (stage: "edit" | "sign" | "send") => {
    const stages = ["edit", "sign", "send"];
    return stages.indexOf(stage);
  };

  // Calculate direction of transition: 1 for forward, -1 for backward
  const transitionDirection =
    previousStage && currentStage
      ? getStageIndex(currentStage) > getStageIndex(previousStage)
        ? 1
        : -1
      : 1;

  // Get position for the active stage indicator
  const getActiveStagePosition = () => {
    switch (currentStage) {
      case "edit":
        return "left-0";
      case "sign":
        return "left-1/3";
      case "send":
        return "left-2/3";
      default:
        return "left-0";
    }
  };

  // Get width percentage based on stage
  const getProgressWidth = () => {
    switch (currentStage) {
      case "edit":
        return "33%";
      case "sign":
        return "66%";
      case "send":
        return "100%";
      default:
        return "33%";
    }
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
              <div className="flex items-center h-10 justify-center gap-2 px-1 bg-white rounded-lg border border-gray-200 shadow-sm relative overflow-hidden min-w-[320px]">
                {/* Animated background for fluid stage transition */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-green-100 to-transparent transition-all duration-700 ease-in-out ${
                    isTransitioning ? "opacity-30 flow-animation" : "opacity-0"
                  }`}
                  style={{
                    transform: `translateX(${transitionDirection * 100}%)`,
                  }}
                />

                <div className="flex items-center relative w-full">
                  {/* Active stage indicator that moves smoothly */}
                  <div
                    className={`absolute top-0 h-8 bg-[#E5FFE7] border border-gray-100 rounded-2xl transition-all duration-500 ease-in-out z-0`}
                    style={{
                      width: currentStage === "sign" ? "28%" : "24%",
                      left:
                        currentStage === "edit"
                          ? "5%"
                          : currentStage === "sign"
                          ? "36%"
                          : "70%",
                    }}
                  />

                  {/* Stage indicators */}
                  <div className="flex items-center w-full justify-between px-4">
                    <div className="flex items-center gap-4 transition-colors duration-300 z-10">
                      <span className="flex items-center justify-center w-6 h-6 bg-white rounded-md text-sm font-medium shadow-sm">
                        1
                      </span>
                      <span className="text-sm font-medium">Draft</span>
                    </div>
                    <div className="flex items-center gap-4 transition-colors duration-300 z-10">
                      <span className="flex items-center justify-center w-6 h-6 bg-white rounded-lg text-sm font-medium shadow-sm">
                        2
                      </span>
                      <span className="text-sm font-medium">Sign</span>
                    </div>
                    <div className="flex items-center gap-4 transition-colors duration-300 z-10">
                      <span className="flex items-center justify-center w-6 h-6 bg-white rounded-lg text-sm font-medium shadow-sm">
                        3
                      </span>
                      <span className="text-sm font-medium">Send</span>
                    </div>
                  </div>
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
                  className="px-4 py-2 h-[40px] text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors min-w-[100px] font-medium"
                >
                  Back
                </button>
              )}
              {currentStage !== "send" && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 h-[40px] bg-black text-white rounded-md hover:bg-gray-800 transition-colors min-w-[100px] font-medium border-2 border-orange-500"
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
