import { useState, useEffect } from "react";
import axios from "axios";
import { debounce } from "lodash";
import {
  PaperAirplaneIcon,
  ArrowRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  BugAntIcon,
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
import {
  doc,
  updateDoc,
  serverTimestamp,
  getFirestore,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/index";
import { generatePreviewToken } from "@/lib/firebase/token";
import { useRouter } from "next/navigation";
// import ShareModal from "./ShareModal"; // Comment out until ShareModal is implemented
import jsPDF from "jspdf";

const SHOW_DEBUG_BUTTONS = false;

// Define types for contract content
interface BlockData {
  text?: string;
  items?: string[];
}

interface Block {
  type: string;
  data: BlockData;
}

interface EditorContent {
  blocks: Block[];
  time: number;
  version: string;
}

interface SendStageProps {
  onSend?: (clientName: string, clientEmail: string) => void;
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
      const viewUrl = `${window.location.origin}/contract-view/${contractId}?token=${viewToken}`;

      // First update contract status in Firestore to ensure token is saved
      const firestore = getFirestore();
      if (!firestore) throw new Error("Firestore not initialized");

      await updateDoc(doc(firestore, "contracts", contractId), {
        status: "pending",
        recipientEmail: clientEmail,
        recipientName: clientName,
        viewToken: viewToken,
        sentAt: serverTimestamp(),
        designerEmail: user.email, // Store designer email for notifications
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
        onSend(clientName, clientEmail);
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

      // Open in new tab with the token - UPDATED to use contract-view route which is more stable
      window.open(
        `/contract-view/${contractId}?token=${previewToken}`,
        "_blank"
      );
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview. Please try again.");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        toast.error("Contract ID not found");
        return;
      }

      // Display loading toast
      const loadingToast = toast.loading("Generating PDF...");

      // Get the contract content from localStorage
      const savedContent = localStorage.getItem(
        `contract-content-${contractId}`
      );
      if (!savedContent) {
        toast.dismiss(loadingToast);
        toast.error("No contract content found");
        return;
      }

      // Get designer and client signature data
      let designerSignature = "";
      let designerName = "";
      let designerDate = "";
      let clientSignature = "";
      let clientName = "";
      let clientDate = "";

      // 1. First try to get signatures from Firestore
      try {
        const firestore = getFirestore();
        if (firestore) {
          // Get designer signature
          const designerSignatureRef = doc(
            firestore,
            "contracts",
            contractId,
            "signatures",
            "designer"
          );
          const designerSignatureSnap = await getDoc(designerSignatureRef);

          if (designerSignatureSnap.exists()) {
            const designerData = designerSignatureSnap.data();
            designerSignature = designerData.signature || "";
            designerName = designerData.name || "Designer";
            designerDate = designerData.signedAt
              ? new Date(designerData.signedAt.toDate()).toLocaleDateString()
              : new Date().toLocaleDateString();
          }

          // Get client signature
          const clientSignatureRef = doc(
            firestore,
            "contracts",
            contractId,
            "signatures",
            "client"
          );
          const clientSignatureSnap = await getDoc(clientSignatureRef);

          if (clientSignatureSnap.exists()) {
            const clientData = clientSignatureSnap.data();
            clientSignature = clientData.signature || "";
            clientName = clientData.name || "Client";
            clientDate = clientData.signedAt
              ? new Date(clientData.signedAt.toDate()).toLocaleDateString()
              : "";
          }
        }
      } catch (firestoreError) {
        console.error(
          "Error fetching signatures from Firestore:",
          firestoreError
        );
        // Continue with localStorage fallback
      }

      // SIMPLIFIED: No localStorage fallback - only Firestore

      // SIMPLIFIED: No localStorage fallback for client signature

      // Also check contract meta for recipient info
      if (!clientName) {
        const contractMetaStr = localStorage.getItem(
          `contract-meta-${contractId}`
        );
        if (contractMetaStr) {
          try {
            const contractMeta = JSON.parse(contractMetaStr);
            if (contractMeta.recipientName) {
              clientName = contractMeta.recipientName;
            }
            if (contractMeta.signedAt) {
              clientDate = new Date(contractMeta.signedAt).toLocaleDateString();
            }
          } catch (e) {
            console.error("Error parsing contract meta from localStorage:", e);
          }
        }
      }

      let parsedContent: EditorContent;
      try {
        parsedContent = JSON.parse(savedContent);
        if (!parsedContent.blocks || parsedContent.blocks.length === 0) {
          toast.dismiss(loadingToast);
          toast.error("Contract content is empty");
          return;
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("Invalid contract content format");
        return;
      }

      // Create a new PDF document
      const pdf = new jsPDF();
      let yPosition = 10;

      // Add a title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Contract Document", 105, yPosition, { align: "center" });
      yPosition += 15;

      // Add content from blocks
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      const margin = 20;
      const pageWidth = pdf.internal.pageSize.width - margin * 2;

      parsedContent.blocks.forEach((block: Block) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 10;
        }

        if (block.type === "header" && block.data.text) {
          pdf.setFontSize(16);
          pdf.setFont("helvetica", "bold");

          const splitText = pdf.splitTextToSize(block.data.text, pageWidth);
          pdf.text(splitText, margin, yPosition);
          yPosition += 10 * splitText.length;

          pdf.setFontSize(12);
          pdf.setFont("helvetica", "normal");
        } else if (block.type === "paragraph" && block.data.text) {
          const splitText = pdf.splitTextToSize(block.data.text, pageWidth);
          pdf.text(splitText, margin, yPosition);
          yPosition += 7 * splitText.length;
        } else if (
          block.type === "list" &&
          block.data.items &&
          block.data.items.length
        ) {
          block.data.items.forEach((item: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 10;
            }

            const itemText = `• ${item}`;
            const splitText = pdf.splitTextToSize(itemText, pageWidth - 5);
            pdf.text(splitText, margin, yPosition);
            yPosition += 7 * splitText.length;
          });
        }

        yPosition += 5; // Add space between blocks
      });

      // Add signatures section
      if (yPosition > 200) {
        // Add a new page if we're too far down
        pdf.addPage();
        yPosition = 20;
      } else {
        // Add extra space before signatures
        yPosition += 30;
      }

      // Add signature title
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Signatures", margin, yPosition);
      yPosition += 15;

      // Reset font
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      // Designer signature section
      pdf.text(`Designer: ${designerName}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Date: ${designerDate}`, margin, yPosition);
      yPosition += 15;

      // Add designer signature if available
      if (designerSignature) {
        try {
          pdf.addImage(designerSignature, "PNG", margin, yPosition, 80, 30);
          yPosition += 40;
        } catch (error) {
          console.error("Error adding designer signature:", error);
          pdf.text("(Signature)", margin, yPosition);
          yPosition += 15;
        }
      } else {
        pdf.text("(Signature not available)", margin, yPosition);
        yPosition += 15;
      }

      // Add space between signatures
      yPosition += 10;

      // Client signature section
      pdf.text(`Client: ${clientName || "Not signed yet"}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Date: ${clientDate || "Not signed yet"}`, margin, yPosition);
      yPosition += 15;

      // Add client signature if available
      if (clientSignature) {
        try {
          pdf.addImage(clientSignature, "PNG", margin, yPosition, 80, 30);
        } catch (error) {
          console.error("Error adding client signature:", error);
          pdf.text("(Signature)", margin, yPosition);
        }
      } else {
        pdf.text("(Signature not available)", margin, yPosition);
      }

      // Finalize PDF and download
      pdf.save(`contract-${contractId}.pdf`);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const debugContract = () => {
    try {
      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        console.log("No contract ID found in URL");
        return;
      }

      // Get all localStorage keys
      console.log("All localStorage keys:", Object.keys(localStorage));

      // Check for contract content
      const contentKey = `contract-content-${contractId}`;
      const savedContent = localStorage.getItem(contentKey);

      if (!savedContent) {
        console.log(`No content found for key: ${contentKey}`);

        // Look for any contract content keys
        const contractKeys = Object.keys(localStorage).filter((key) =>
          key.startsWith("contract-content-")
        );

        console.log("Available contract content keys:", contractKeys);
        return;
      }

      // Try to parse the content
      try {
        const parsedContent = JSON.parse(savedContent);
        console.log("Contract content:", parsedContent);
        console.log("Content has blocks:", !!parsedContent.blocks);
        console.log("Blocks count:", parsedContent.blocks?.length || 0);

        if (parsedContent.blocks && parsedContent.blocks.length > 0) {
          console.log("First few blocks:", parsedContent.blocks.slice(0, 3));
        }
      } catch (error) {
        console.error("Error parsing contract content:", error);
        console.log("Raw content:", savedContent);
      }
    } catch (error) {
      console.error("Debug error:", error);
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
        className="mb-3 w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        Preview Client View
      </button>

      <button
        onClick={handleDownloadPDF}
        className="mb-6 w-full py-2 px-4 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
      >
        <ArrowDownTrayIcon className="h-5 w-5" />
        Download as PDF
      </button>

      {SHOW_DEBUG_BUTTONS && (
        <button
          onClick={debugContract}
          className="mb-6 w-full py-2 px-4 flex items-center justify-center gap-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          <BugAntIcon className="h-5 w-5" />
          Debug Contract Data
        </button>
      )}

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
