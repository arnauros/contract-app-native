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
  // Initialize signed state based on designer signature prop
  const hasInitialSignature = !!designerSignature;
  const initialName = designerSignature?.name || "";

  const [name, setName] = useState(initialName);
  const [isValid, setIsValid] = useState(false);
  const [isSigned, setIsSigned] = useState(hasInitialSignature);
  const [isRemoving, setIsRemoving] = useState(false);
  const signaturePadRef = useRef<any>(null);
  const forceRefreshKey = useRef(Date.now());

  // Force a refresh immediately after mount to ensure correct state
  useEffect(() => {
    // Force refresh after a short delay
    const timer = setTimeout(() => {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) return;

      console.log("🖊️ SigningStage: Initial mount force refresh", {
        hasInitialSignature,
        designerSignature,
      });

      // Check localStorage as a fallback
      const savedSignatureData = localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );

      const hasStoredSignature = !!savedSignatureData;

      // If we have a signature from props or localStorage, update state
      if (hasInitialSignature || hasStoredSignature) {
        setIsSigned(true);

        if (hasInitialSignature && designerSignature?.name) {
          setName(designerSignature.name);
        } else if (hasStoredSignature) {
          try {
            const parsedData = JSON.parse(savedSignatureData!);
            if (parsedData && parsedData.name) {
              setName(parsedData.name);
            }
          } catch (e) {
            console.error("Error parsing saved signature data:", e);
          }
        }

        // Force a component update
        forceRefreshKey.current = Date.now();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Check for existing signature - from both props and localStorage
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    console.log("🖊️ SigningStage: Checking signature state", {
      designerSignature,
      isSigned,
      forceRefreshKey: forceRefreshKey.current,
    });

    // Track whether we found a signature
    let foundSignature = false;

    // First check Firestore signature (from props)
    if (designerSignature) {
      console.log("✅ Found signature in props:", designerSignature);
      setName(designerSignature.name || "");
      setIsSigned(true);
      foundSignature = true;

      // Make sure this is also in localStorage for consistent state
      try {
        localStorage.setItem(
          `contract-designer-signature-${contractId}`,
          JSON.stringify({
            signature: designerSignature.signature,
            name: designerSignature.name,
            signedAt: designerSignature.signedAt?.toDate?.() || new Date(),
          })
        );
        console.log("✅ Saved signature from props to localStorage");
      } catch (e) {
        console.error("Error saving signature to localStorage:", e);
      }
    }

    // If not in props, check localStorage as fallback (or as additional verification)
    if (!foundSignature) {
      try {
        const savedSignature = localStorage.getItem(
          `contract-designer-signature-${contractId}`
        );

        if (savedSignature) {
          console.log("✅ Found signature in localStorage");
          try {
            const signatureData = JSON.parse(savedSignature);
            setName(signatureData.name || "");
            setIsSigned(true);
            foundSignature = true;
          } catch (parseError) {
            console.error(
              "Error parsing signature from localStorage:",
              parseError
            );
          }
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
    }

    // If no signature was found from any source, reset state
    if (!foundSignature) {
      console.log("❌ No signature found from any source");
      setIsSigned(false);
      setName("");

      // Make sure the signature pad is clear
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
      }
    }
  }, [designerSignature, forceRefreshKey.current]);

  // Listen for signature state change events from other components
  useEffect(() => {
    const handleSignatureStateChanged = (e: CustomEvent) => {
      const detail = e.detail || {};
      const contractId = window.location.pathname.split("/").pop();

      console.log("📝 SigningStage: Signature state changed event received", {
        detail,
        currentContractId: contractId,
      });

      if (detail.contractId === contractId) {
        // Force refresh our component
        forceRefreshKey.current = Date.now();

        // Update our internal state
        setIsSigned(!!detail.hasDesignerSignature);

        if (!detail.hasDesignerSignature) {
          // Clear any existing signature data
          setName("");
          setIsValid(false);

          // Clear the signature pad
          if (signaturePadRef.current) {
            signaturePadRef.current.clear();
          }
        }
      }
    };

    window.addEventListener(
      "signatureStateChanged",
      handleSignatureStateChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "signatureStateChanged",
        handleSignatureStateChanged as EventListener
      );
    };
  }, []);

  // Listen for stage refresh events
  useEffect(() => {
    const handleStageChange = (e: CustomEvent) => {
      const detail = e.detail || {};
      const isSignStage = detail.stage === "sign" || detail === "sign";
      const isRefreshed = detail.refreshed === true;
      const source = detail.source || "unknown";

      if (isSignStage) {
        console.log("🔄 SigningStage: Detected sign stage change", {
          detail,
          isSigned,
          name,
        });

        if (isRefreshed) {
          // This is a signal to fully refresh our component state
          forceRefreshKey.current = Date.now();

          // Clear any existing signature data in the pad
          if (signaturePadRef.current) {
            signaturePadRef.current.clear();
          }

          // Force a fresh check of signature status to ensure we're in sync
          const contractId = window.location.pathname.split("/").pop();
          if (contractId) {
            // Check both localStorage and component props
            const freshFromStorage = localStorage.getItem(
              `contract-designer-signature-${contractId}`
            );

            const hasStorageSignature = !!freshFromStorage;
            const hasPropsSignature = !!designerSignature;

            console.log(`🔄 SigningStage refresh (${source}):`, {
              hasStorageSignature,
              hasPropsSignature,
              currentIsSigned: isSigned,
            });

            // Update state based on fresh signature check
            if (hasStorageSignature) {
              try {
                const sigData = JSON.parse(freshFromStorage!);
                setName(sigData.name || "");
                setIsSigned(true);
              } catch (e) {
                console.error("Error parsing localStorage signature:", e);
              }
            } else if (hasPropsSignature) {
              setName(designerSignature.name || "");
              setIsSigned(true);
            } else {
              // No signature found in any source
              setIsSigned(false);
              setName("");
              setIsValid(false);
            }
          }
        }
      }
    };

    window.addEventListener("stageChange", handleStageChange as EventListener);
    return () => {
      window.removeEventListener(
        "stageChange",
        handleStageChange as EventListener
      );
    };
  }, [designerSignature, isSigned, name]);

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
      forceRefreshKey.current = Date.now();

      // Clear the signature pad immediately
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
      }

      // Force a refresh of the signing stage
      setTimeout(() => {
        const stageEvent = new CustomEvent("stageChange", {
          detail: { stage: "sign", refreshed: true, source: "handleReset" },
        });
        window.dispatchEvent(stageEvent);
      }, 300);

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
    <div
      className="bg-white rounded-lg border border-gray-200 p-6"
      key={forceRefreshKey.current}
    >
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
