"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  getContract,
  getSignatures,
  saveSignature,
} from "@/lib/firebase/firestore";
import {
  validateContractToken,
  ContractAccessError,
} from "@/lib/firebase/token";
import { Contract } from "@/lib/firebase/types";
import { toast } from "react-hot-toast";
import { getAuth, signInAnonymously } from "firebase/auth";
import SignaturePad from "react-signature-canvas";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";

export default function PublicContractViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState("");
  const [existingSignature, setExistingSignature] = useState<{
    signature: string;
    name: string;
    signedAt: Date | null;
  } | null>(null);
  const signaturePadRef = useRef<any>(null);

  // Load contract and signatures
  useEffect(() => {
    console.log("\n\n====== PUBLIC CONTRACT VIEW PAGE ======");
    console.log(`Contract ID: ${id}`);
    console.log(`Token provided: ${token ? "Yes" : "No"}`);

    async function loadContractAndSignatures() {
      try {
        setIsLoading(true);

        if (!token) {
          console.log(
            "No token provided, but continuing as contracts are public"
          );
        }

        console.log("Fetching contract from Firestore...");
        const result = await getContract(id);
        console.log("Contract fetch result:", result);

        if (result.error) {
          console.log("Error fetching contract:", result.error);
          throw new Error(result.error);
        }

        const contractData = result.contract;
        if (!contractData) {
          console.log("Contract not found");
          throw ContractAccessError.CONTRACT_NOT_FOUND;
        }

        // If we have a token, validate it for tracking purposes
        if (token) {
          console.log("Contract found, validating token...");
          try {
            const validation = await validateContractToken(id, token);
            const hasValidToken = validation.isValid;
            console.log("Token validation result:", hasValidToken);
          } catch (error) {
            console.error("Token validation error:", error);
            // We log the error but don't block access
            console.log("Continuing anyway as contracts are public");
          }
        }

        // Always grant access if contract exists
        console.log("Access granted - all contracts are public");
        setContract(contractData);

        // Load existing signatures
        const signaturesResult = await getSignatures(id);
        if (signaturesResult.success) {
          const { client } = signaturesResult.signatures;
          if (client) {
            setExistingSignature({
              signature: client.signature,
              name: client.name,
              signedAt: client.signedAt?.toDate?.() || null,
            });
          }
        }
      } catch (error: any) {
        console.error("Error loading contract:", error);
        setError(error?.message || "Failed to load contract");
      } finally {
        setIsLoading(false);
        console.log(
          "====== PUBLIC CONTRACT VIEW PAGE LOAD COMPLETE ======\n\n"
        );
      }
    }

    if (id) {
      loadContractAndSignatures();
    }
  }, [id, token]);

  const handleSignContract = () => {
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = async () => {
    if (!signaturePadRef.current || !signerName.trim()) {
      toast.error("Please enter your name and draw your signature");
      return;
    }

    try {
      setIsSigning(true);
      const signatureImage = signaturePadRef.current.toDataURL();

      // Sign in anonymously if not already authenticated
      const auth = getAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // Save signature to database
      const result = await saveSignature(id, "client", {
        contractId: id,
        userId: auth.currentUser?.uid || "anonymous",
        signature: signatureImage,
        signedAt: new Date(),
        name: signerName,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setExistingSignature({
        signature: signatureImage,
        name: signerName,
        signedAt: new Date(),
      });

      setShowSignatureModal(false);
      toast.success("Contract signed successfully!");

      // Refresh page to update UI
      window.location.reload();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Failed to sign contract. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-medium mb-4">Loading contract...</h2>
          <div className="animate-pulse h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="animate-pulse h-4 w-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-medium text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-medium text-red-600 mb-2">
            Contract Not Found
          </h2>
          <p className="text-gray-700">
            The contract you're looking for could not be found or you don't have
            permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">
          {contract.title || "Contract"}
        </h1>

        <div className="prose max-w-none mb-8">
          {typeof contract.content === "string" ? (
            <div dangerouslySetInnerHTML={{ __html: contract.content }} />
          ) : (
            <pre className="p-4 bg-gray-100 rounded-lg overflow-x-auto">
              {JSON.stringify(contract.content, null, 2)}
            </pre>
          )}
        </div>

        {/* Signature Section */}
        <div className="border-t pt-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Signature</h2>

          {existingSignature ? (
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <img
                    src={existingSignature.signature}
                    alt="Signature"
                    className="h-24 mx-auto object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium">{existingSignature.name}</p>
                  {existingSignature.signedAt && (
                    <p className="text-sm text-gray-500">
                      Signed on{" "}
                      {existingSignature.signedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleSignContract}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Contract
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sign Contract</h2>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Signature
                </label>
                <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
                  <SignaturePad
                    ref={signaturePadRef}
                    canvasProps={{
                      className: "w-full h-48",
                    }}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => signaturePadRef.current?.clear()}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignatureComplete}
                  disabled={isSigning || !signerName.trim()}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                    isSigning || !signerName.trim()
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSigning ? "Signing..." : "Sign Contract"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
