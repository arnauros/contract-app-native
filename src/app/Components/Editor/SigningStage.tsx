import { useState, useRef, useEffect } from "react";
import SignaturePad from "react-signature-canvas";
import { CheckIcon } from "@heroicons/react/20/solid";

interface SigningStageProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signature: string, name: string) => void;
}

export function SigningStage({ isOpen, onClose, onSign }: SigningStageProps) {
  const [name, setName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const signaturePadRef = useRef<any>(null);

  // Add validation function
  const validateForm = () => {
    const isNameValid = name.trim().length > 0;
    const isSignatureValid =
      signaturePadRef.current && !signaturePadRef.current.isEmpty();

    setIsValid(isNameValid && isSignatureValid);
  };

  // Validate on name change
  useEffect(() => {
    validateForm();
  }, [name]);

  if (isSigned) {
    const savedData = JSON.parse(
      localStorage.getItem("contract-signature") || "{}"
    );
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-green-100 rounded-full mx-auto flex items-center justify-center">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Contract Signed!
          </h2>
          <p className="text-gray-600">
            Thank you, {savedData.name}. Your signature has been recorded.
          </p>
          <p className="text-sm text-gray-500">
            Click Next to proceed to the send stage
          </p>
        </div>
      </div>
    );
  }

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

        <div className="flex gap-2">
          <button
            onClick={() => signaturePadRef.current?.clear()}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={() => {
              if (isValid && signaturePadRef.current) {
                const signature = signaturePadRef.current.toDataURL();
                const data = { signature, name };
                localStorage.setItem(
                  "contract-signature",
                  JSON.stringify(data)
                );
                setIsSigned(true);
                onSign(signature, name);
              }
            }}
            disabled={!isValid}
            className={`flex-1 px-4 py-2 text-sm text-white rounded-md ${
              isValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-300 cursor-not-allowed"
            }`}
          >
            Sign Contract
          </button>
        </div>
      </div>
    </div>
  );
}
