import { useState, useRef } from "react";
import SignaturePad from "react-signature-canvas";

interface SigningStageProps {
  onSign: (signature: string, name: string) => void;
}

export function SigningStage({ onSign }: SigningStageProps) {
  const [name, setName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const signaturePadRef = useRef<any>(null);

  const validateForm = () => {
    const hasSignature = !signaturePadRef.current?.isEmpty();
    const hasName = name.trim().length > 0;
    setIsValid(hasSignature && hasName);
  };

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
          <div className="border border-gray-300 rounded-md">
            <SignaturePad
              ref={signaturePadRef}
              onEnd={validateForm}
              canvasProps={{
                className: "w-full h-40",
              }}
            />
          </div>
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
                onSign(signaturePadRef.current.toDataURL(), name);
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
