import { useState, useEffect } from "react";
import axios from "axios";
import { debounce } from "lodash";
import {
  PaperAirplaneIcon,
  ArrowRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getAuth } from "firebase/auth";
import { useAuth } from "@/lib/hooks/useAuth";
import { v4 as uuidv4 } from "uuid";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/index";
import { generatePreviewToken } from "@/lib/firebase/token";
import { useRouter } from "next/navigation";
import ShareModal from "./ShareModal";

// Add this for debugging - set to false to hide debug buttons
const SHOW_DEBUG_BUTTONS = false;

interface SendStageProps {
  onSend?: () => void;
  title: string;
}

export function SendStage({ onSend, title }: SendStageProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      clientName.trim().length > 0 &&
      clientEmail.trim().length > 0 &&
      emailRegex.test(clientEmail)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("You must be logged in to send contracts");
      }

      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) throw new Error("Contract ID not found");

      // Generate a unique view token
      const viewToken = uuidv4();

      // Construct the view URL with the token
      const viewUrl = `${window.location.origin}/view/${contractId}?token=${viewToken}`;

      // First update contract status in Firestore to ensure token is saved
      await updateDoc(doc(db, "contracts", contractId), {
        status: "pending",
        recipientEmail: clientEmail,
        recipientName: clientName,
        viewToken: viewToken,
        sentAt: serverTimestamp(),
      });

      // Send the email using Firebase function
      const functions = getFunctions(undefined, "us-central1");
      const sendContractEmail = httpsCallable(functions, "sendContractEmail");
      await sendContractEmail({
        to: clientEmail,
        clientName: clientName,
        contractId: contractId,
        viewUrl: viewUrl,
        contractTitle: title,
      });

      setIsSuccess(true);
      toast.success("Contract sent successfully!");

      if (onSend) {
        onSend();
      }
    } catch (err) {
      console.error("Error sending contract:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while sending the contract"
      );
      toast.error(error || "Failed to send contract. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setIsSending(true);

      // Check if user is authenticated
      if (!user) {
        throw new Error("You must be logged in to send test emails");
      }

      const functions = getFunctions(undefined, "us-central1");
      const sendTestEmail = httpsCallable(functions, "sendTestEmail");

      console.log("Sending test email...");

      const result = await sendTestEmail({}); // No need to pass data for test email

      console.log("Test email result:", result);
      toast.success("Test email sent successfully!");
    } catch (error: any) {
      console.error("Test email failed:", error);
      const errorMessage = error.message || "Failed to send test email";
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handlePreview = async () => {
    const contractId = window.location.pathname.split("/").pop();
    if (!contractId) {
      toast.error("Contract ID not found");
      return;
    }

    try {
      // Generate a preview token with 24 hour expiration
      const previewToken = await generatePreviewToken(contractId, 1);

      // Store it temporarily in localStorage for preview purposes
      localStorage.setItem(`preview-token-${contractId}`, previewToken);

      // Open in new tab with the token
      window.open(`/view/${contractId}?token=${previewToken}`, "_blank");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Failed to Send
          </h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsSuccess(false);
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">
            Contract Sent!
          </h2>
          <p className="text-gray-600">
            The contract has been sent to {clientEmail}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Send Contract
      </h2>

      <button
        onClick={handlePreview}
        className="mb-6 w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        Preview Client View
      </button>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Your client's name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            disabled={isSending}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Client Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Your client's email
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            disabled={isSending}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Client Email"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!validateForm() || isSending}
          className={`w-full py-3 px-4 rounded-lg text-white text-center font-medium ${
            validateForm() && !isSending
              ? "bg-gray-900 hover:bg-gray-800"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {isSending ? "Sending..." : "Send Agreement"}
        </button>

        {/* Test button - only visible in development */}
        {process.env.NODE_ENV === "development" && SHOW_DEBUG_BUTTONS && (
          <button
            onClick={handleTestEmail}
            disabled={isSending}
            className="mt-4 w-full py-2 px-4 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50"
          >
            Send Test Email
          </button>
        )}
      </div>
    </div>
  );
}
