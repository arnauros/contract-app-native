import { useState, useRef, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { CheckIcon, ArrowPathIcon } from "@heroicons/react/20/solid";
import { toast } from "react-hot-toast";
import { removeSignature } from "@/lib/firebase/firestore";

export interface SigningStageProps {
  onSign: (signature: string, name: string) => void;
  designerSignature?: any; // Add prop to receive current signature status
}

export function SigningStage({ onSign, designerSignature }: SigningStageProps) {
  const [name, setName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const signaturePadRef = useRef<any>(null);

  // Check for existing signature - from both props and localStorage
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    // First check Firestore signature (from props)
    if (designerSignature) {
      setName(designerSignature.name || "");
      setIsSigned(true);
      return;
    }

    // If not in props, check localStorage as fallback
    try {
      const savedSignature = localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );

      if (savedSignature) {
        const signatureData = JSON.parse(savedSignature);
        setName(signatureData.name);
        setIsSigned(true);
      } else {
        // No signature found - reset state
        setIsSigned(false);
      }
    } catch (error) {
      console.error("Error checking saved signature:", error);
      setIsSigned(false);
    }
  }, [designerSignature]);

  // Validation function
  const validateForm = () => {
    const isNameValid = name.trim().length > 0;
    const isSignatureValid =
      signaturePadRef.current && !signaturePadRef.current.isEmpty();
    setIsValid(isNameValid && isSignatureValid);
  };

  // Handle sign click
  const handleSign = () => {
    if (!isValid || !signaturePadRef.current) return;

    const signature = signaturePadRef.current.toDataURL();
    onSign(signature, name);
  };

  // Clear signature pad
  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsValid(false);
    }
  };

  // Reset and try again
  const handleReset = async () => {
    try {
      setIsRemoving(true);

      // Get contract ID
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        throw new Error("Contract ID not found");
      }

      // Dispatch a custom event to trigger the parent component's handleUnsign
      // This centralizes signature removal logic and ensures consistency
      const unsignEvent = new CustomEvent("unsignContract", {
        detail: { contractId, source: "signingStage" },
      });
      window.dispatchEvent(unsignEvent);

      // Reset local component state
      setIsSigned(false);
      setName("");
      setIsValid(false);

      // Small delay to ensure DOM updates
      setTimeout(() => {
        if (signaturePadRef.current) {
          signaturePadRef.current.clear();
        }

        // Also force a refresh of the signing stage after a short delay
        // This ensures the UI is properly reset after unsigning
        setTimeout(() => {
          const stageEvent = new CustomEvent("stageChange", {
            detail: { stage: "sign", refreshed: true },
          });
          window.dispatchEvent(stageEvent);
        }, 300);
      }, 100);

      toast.success("Signature removed successfully");
    } catch (error) {
      console.error("Error removing signature:", error);
      toast.error("Failed to remove signature");
    } finally {
      setIsRemoving(false);
    }
  };

  // Render signed state
  if (isSigned) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Contract Already Signed
          </h2>
          <p className="text-gray-600">
            This contract has been signed by {name}.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            You can proceed to send the contract
          </p>

          <button
            onClick={handleReset}
            disabled={isRemoving}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              isRemoving
                ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                : "text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            {isRemoving ? "Removing..." : "Remove Signature"}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            <p>
              To edit the contract, first remove your signature or go to the
              Edit tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render signing interface
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Sign Contract</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              validateForm();
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Type your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Signature
          </label>
          <div className="relative">
            <SignaturePad
              ref={signaturePadRef}
              onEnd={validateForm}
              canvasProps={{
                className:
                  "w-full h-40 bg-white border border-gray-200 rounded-md",
              }}
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 bg-white rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>

        <button
          onClick={handleSign}
          disabled={!isValid}
          className={`w-full py-3 px-4 rounded-lg text-white text-center font-medium ${
            isValid
              ? "bg-gray-900 hover:bg-gray-800"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Sign Contract
        </button>
      </div>
    </div>
  );
}
