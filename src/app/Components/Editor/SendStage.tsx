import { useState } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface SendStageProps {
  onSend: (clientName: string, clientEmail: string) => Promise<void>;
}

export function SendStage({ onSend }: SendStageProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      clientName.trim().length > 0 &&
      clientEmail.trim().length > 0 &&
      emailRegex.test(clientEmail)
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSending(true);
      setError(null);

      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) throw new Error("Contract ID not found");

      // Generate a unique view token
      const viewToken = Math.random().toString(36).substr(2, 9);
      const viewUrl = `${window.location.origin}/view/${contractId}?token=${viewToken}`;

      // Save contract data first
      const contractData = {
        ...JSON.parse(localStorage.getItem(`contract-${contractId}`) || "{}"),
        viewToken,
        clientName,
        clientEmail,
        status: "sent",
        sentAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `contract-${contractId}`,
        JSON.stringify(contractData)
      );

      // Send email
      const response = await fetch("/api/sendContract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: clientEmail,
          clientName,
          contractId,
          viewUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to send contract");
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Failed to send contract:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send contract. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handlePreview = () => {
    // Get contract ID from URL
    const contractId = window.location.pathname.split("/").pop();
    // Open preview in new tab
    window.open(`/view/${contractId}`, "_blank");
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
      </div>
    </div>
  );
}
