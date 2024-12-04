"use client";

import Button from "./button";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Modal from "@/app/Components/Modal";

interface TopbarProps {
  pathname: string;
  onStageChange?: (stage: string) => void;
}

export default function Topbar({ pathname }: TopbarProps) {
  const [currentStage, setCurrentStage] = useState<"edit" | "sign" | "send">(
    "edit"
  );
  const params = useParams();
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);

  // Add getBreadcrumb function
  const getBreadcrumb = () => {
    if (pathname.startsWith("/Contracts/") && params.id) {
      return `Dashboard / Contracts / #${params.id}`;
    }
    if (pathname === "/New") {
      return "Dashboard / Contracts / New Contract";
    }
    return "Dashboard / Contracts";
  };

  // Single source of truth for back button handling
  const handleBackClick = () => {
    console.log("⬅️ Back button clicked");
    setIsEditConfirmModalOpen(true);
  };

  // Remove any other back button handlers
  useEffect(() => {
    const handleStageChange = (e: CustomEvent) => {
      console.log("🎧 Topbar received stage change:", e.detail);

      // Only update state for non-edit changes or confirmed edits
      if (
        typeof e.detail === "string" ||
        (e.detail?.stage === "edit" && e.detail?.confirmed)
      ) {
        setCurrentStage(e.detail.stage || e.detail);
      }
    };

    window.addEventListener("stageChange", handleStageChange as EventListener);
    return () =>
      window.removeEventListener(
        "stageChange",
        handleStageChange as EventListener
      );
  }, []);

  const handleNext = () => {
    if (currentStage === "sign") {
      const savedSignature = localStorage.getItem("contract-signature");
      if (!savedSignature) {
        alert("Please sign the contract before proceeding");
        return;
      }
    }

    const nextStage = currentStage === "edit" ? "sign" : "send";
    console.log("🔼 Topbar Next clicked:", currentStage, "→", nextStage);

    const event = new CustomEvent("stageChange", { detail: nextStage });
    window.dispatchEvent(event);
    setCurrentStage(nextStage);
  };

  const confirmEdit = () => {
    console.log("✅ Edit confirmed - dispatching stage change");
    const event = new CustomEvent("stageChange", {
      detail: {
        stage: "edit",
        confirmed: true,
      },
    });
    window.dispatchEvent(event);
    setIsEditConfirmModalOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-gray-100 border-b border-gray-300">
      <div className="flex items-center justify-between h-14 px-4">
        <img
          alt="Your Company"
          src="https://tailwindui.com/plus/img/logos/mark.svg?color=blue&shade=600"
          className="h-8 w-auto"
        />
        {pathname.startsWith("/Contracts/") && (
          <span className="text-gray-500 text-sm mx-4">{getBreadcrumb()}</span>
        )}
        <div className="flex-1 flex justify-center">
          {pathname.startsWith("/Contracts/") && (
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
        {pathname.startsWith("/Contracts/") && (
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
      <Modal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        title="Edit Contract"
        onConfirm={confirmEdit}
        confirmText="Continue"
      >
        <p>
          Editing the contract will invalidate the current signature. You will
          need to sign the contract again. Do you want to continue?
        </p>
      </Modal>
    </header>
  );
}
