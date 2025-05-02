import { useState, useRef, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { CheckIcon } from "@heroicons/react/20/solid";

export interface SigningStageProps {
  onSign: (signature: string, name: string) => void;
}

export function SigningStage({ onSign }: SigningStageProps) {
  const [name, setName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const signaturePadRef = useRef<any>(null);

  // Check for existing signature
  useEffect(() => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) return;

    const savedSignature = localStorage.getItem(
      `contract-designer-signature-${contractId}`
    );

    if (savedSignature) {
      const signatureData = JSON.parse(savedSignature);
      setName(signatureData.name);
      setIsSigned(true);
    }
  }, []);

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
          <p className="text-sm text-gray-500">
            You can proceed to send the contract
          </p>
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
            onChange={(e) => setName(e.target.value)}
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
            onEnd={validateForm}
            canvasProps={{
              className:
                "w-full h-40 bg-white border border-gray-200 rounded-md",
            }}
          />
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
