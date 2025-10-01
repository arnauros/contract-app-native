"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Modal from "@/app/Components/Modal";
import { toast } from "react-hot-toast";
import { FiMenu } from "react-icons/fi";
import { useSidebar } from "@/lib/context/SidebarContext";
import { useCanEditContract } from "@/lib/hooks/useSignatureState";
import { getSignatures } from "@/lib/firebase/firestore";
import UsersDisplay from "@/app/Components/UsersDisplay";
import useActiveUsers from "@/lib/hooks/useActiveUsers";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

interface TopbarProps {
  pathname: string;
}

// Simple saving indicator component that listens to events from ContractEditor
function SavingIndicator() {
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    const handleSaveStatusChange = (e: CustomEvent) => {
      setSaveStatus(e.detail);
    };

    window.addEventListener(
      "saveStatusChange",
      handleSaveStatusChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "saveStatusChange",
        handleSaveStatusChange as EventListener
      );
    };
  }, []);

  if (saveStatus === "saving") {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Saving...</span>
      </div>
    );
  }

  if (saveStatus === "saved") {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Saved</span>
      </div>
    );
  }

  if (saveStatus === "error") {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span>Error</span>
      </div>
    );
  }

  return null;
}

export default function Topbar({ pathname }: TopbarProps) {
  const { toggleSidebar } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    "edit"
  );
  const [previousStage, setPreviousStage] = useState<
    "edit" | "sign" | "send" | null
  >(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { loggedIn, user } = useAuth();

  // Removed legacy PDF upload handler (processing now tied to primary form input)

  // Get active users for current contract
  const contractId = params?.id as string;
  const { activeUsers } = useActiveUsers(contractId);

  // Centralized signature state management
  const { canEdit, reason, isLoading } = useCanEditContract(contractId);

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

  // Navigation rules with centralized signature checking - LEGAL WORKFLOW PROTECTION
  const handleBackClick = async () => {
    if (!contractId) return;

    // Handle navigation based on current stage
    if (currentStage === "send") {
      // Going from send to sign is always allowed
      const event = new CustomEvent("stageChange", { detail: "sign" });
      window.dispatchEvent(event);
    } else if (currentStage === "sign") {
      // Use centralized signature checking
      if (!canEdit) {
        console.log("🚨 LEGAL BLOCK:", reason);
        toast.error(
          reason ||
            "Cannot edit signed contract. Remove signature first to edit."
        );

        // Show the unsign modal/prompt instead of allowing navigation
        const event = new CustomEvent("requestUnsignPrompt", {
          detail: { source: "topbar-back-blocked" },
        });
        window.dispatchEvent(event);

        // DO NOT proceed with navigation - this is the key fix
        return;
      } else {
        // Can safely go to edit mode
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
    if (pathname.startsWith("/Invoices/") && params?.id) {
      if (pathname.includes("/edit")) {
        return `Dashboard / Invoices / #${params.id} / Edit`;
      }
      return `Dashboard / Invoices / #${params.id}`;
    }
    if (pathname === "/new") {
      return "Dashboard / Contracts / New Contract";
    }
    return "Dashboard / Contracts";
  };

  // Get breadcrumb as JSX with clickable links
  const getBreadcrumbJSX = () => {
    if (pathname.startsWith("/Contracts/") && params?.id) {
      return (
        <>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Dashboard
          </button>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-500">#{params.id}</span>
        </>
      );
    }
    if (pathname.startsWith("/Invoices/") && params?.id) {
      if (pathname.includes("/edit")) {
        return (
          <>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Dashboard
            </button>
            <span className="text-gray-400 mx-2">/</span>
            <button
              onClick={() => router.push(`/Invoices/${params.id}`)}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Invoice #{params.id}
            </button>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-500">Edit</span>
          </>
        );
      }
      return (
        <>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Dashboard
          </button>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-500">Invoice #{params.id}</span>
        </>
      );
    }
    if (pathname === "/new") {
      return (
        <>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Dashboard
          </button>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-gray-500">New Contract</span>
        </>
      );
    }
    return (
      <>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          Dashboard
        </button>
        <span className="text-gray-400 mx-2">/</span>
        <span className="text-gray-500">Contracts</span>
      </>
    );
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
  const isInvoicePage = pathname.startsWith("/Invoices/") && params?.id;
  const isInvoiceEditPage =
    pathname.startsWith("/Invoices/") &&
    pathname.includes("/edit") &&
    params?.id;
  const showSpecialTopbar =
    isContractPage || isInvoicePage || isInvoiceEditPage;

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-4">
          {(isContractPage || isInvoicePage || isInvoiceEditPage) && (
            <div className="text-sm">{getBreadcrumbJSX()}</div>
          )}
          {!showSpecialTopbar && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </button>
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
                  {/* Stage indicators */}
                  <div className="flex items-center w-full justify-between px-4">
                    <div
                      className={`flex items-center gap-2 z-10 px-3 py-1 rounded-md transition-all duration-300 ease-in-out ${
                        currentStage === "edit"
                          ? "bg-[#E5FFE7]"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-white rounded-sm text-sm font-medium shadow-sm">
                        1
                      </div>
                      <span className="text-sm font-medium">Draft</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 z-10 px-3 py-1 rounded-md transition-all duration-300 ease-in-out ${
                        currentStage === "sign"
                          ? "bg-[#E5FFE7]"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-white rounded-sm text-sm font-medium shadow-sm">
                        2
                      </div>
                      <span className="text-sm font-medium">Sign</span>
                    </div>
                    <div
                      className={`flex items-center gap-2 z-10 px-3 py-1 rounded-md transition-all duration-300 ease-in-out ${
                        currentStage === "send"
                          ? "bg-[#E5FFE7]"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 bg-white rounded-sm text-sm font-medium shadow-sm">
                        3
                      </div>
                      <span className="text-sm font-medium">Send</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Saving Status - only for contracts */}
          {isContractPage && (
            <div className="flex items-center gap-2 text-sm">
              <SavingIndicator />
            </div>
          )}

          {/* Removed legacy Upload PDF button */}

          {/* Active Users Display - only for contracts */}
          {isContractPage && activeUsers.length > 0 && (
            <div className="mr-2">
              <UsersDisplay users={activeUsers} />
            </div>
          )}

          {/* Navigation Controls - only for contracts */}
          {isContractPage && (
            <div className="flex gap-2">
              {currentStage !== "edit" && (
                <button
                  onClick={handleBackClick}
                  className="px-4 py-2 h-[40px] text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-300 ease-in-out min-w-[100px] font-medium"
                >
                  Back
                </button>
              )}
              {currentStage !== "send" && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 h-[40px] bg-black text-white rounded-md hover:bg-gray-800 transition-all duration-300 ease-in-out min-w-[100px] font-medium"
                >
                  Next
                </button>
              )}
            </div>
          )}

          {/* Invoice Action Controls */}
          {isInvoicePage && !isInvoiceEditPage && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/Invoices/${params?.id}/edit`)}
                className="px-4 py-2 h-[40px] bg-black text-white rounded-md hover:bg-gray-800 transition-all duration-300 ease-in-out min-w-[100px] font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            </div>
          )}

          {/* Invoice Edit Action Controls */}
          {isInvoiceEditPage && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/Invoices/${params?.id}`)}
                className="px-4 py-2 h-[40px] text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-300 ease-in-out min-w-[100px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Trigger save action - this will need to be handled by the page component
                  const event = new CustomEvent("saveInvoice");
                  window.dispatchEvent(event);
                }}
                className="px-4 py-2 h-[40px] bg-black text-white rounded-md hover:bg-gray-800 transition-all duration-300 ease-in-out min-w-[100px] font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save
              </button>
            </div>
          )}

          {/* User settings: avatar moved to furthest right */}
          <Link href="/settings" className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
