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
import { saveInvoice } from "@/lib/firebase/firestore";
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
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
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

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const contractId = window.location.pathname.split("/").pop();
      if (!contractId) {
        throw new Error("Contract ID not found");
      }

      // Get contract data for client info
      const contract = await getDoc(doc(db, "contracts", contractId));
      if (!contract.exists()) {
        throw new Error("Contract not found");
      }

      const contractData = contract.data();

      // Extract contract content text from EditorJS blocks
      let contractContentText = "";
      if (contractData.content?.blocks) {
        contractContentText = contractData.content.blocks
          .map((block: any) => {
            if (block.type === "paragraph" && block.data?.text) {
              return block.data.text;
            }
            if (block.type === "header" && block.data?.text) {
              return block.data.text;
            }
            if (block.type === "list" && block.data?.items) {
              return block.data.items.join(" ");
            }
            return "";
          })
          .filter(Boolean)
          .join(" ");
      }

      // Extract client data using regex patterns
      const extractClientData = (text: string) => {
        const clientNameMatch = text.match(
          /(?:Client|Client Name)[:\s]+([A-Za-z\s]+?)(?:\s*\(|,|\.|$)/i
        );
        const emailMatch = text.match(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        const companyMatch = text.match(
          /(?:Company|Organization|Corporation)[:\s]+([A-Za-z\s&]+?)(?:\s*\(|,|\.|$)/i
        );
        const amountMatch = text.match(
          /(?:Total|Budget|Amount)[:\s]*\$?([0-9,]+(?:\.[0-9]{2})?)/i
        );
        const paymentMatch = text.match(
          /(?:Payment Terms|Payment Schedule)[:\s]+([^\n\r]+?)(?:\n|$)/i
        );

        return {
          clientName: clientNameMatch?.[1]?.trim() || "",
          clientEmail: emailMatch?.[1] || "",
          clientCompany: companyMatch?.[1]?.trim() || "",
          totalAmount: amountMatch?.[1]?.replace(/,/g, "") || "",
          paymentTerms: paymentMatch?.[1]?.trim() || "",
        };
      };

      const extractedData = extractClientData(contractContentText);

      // Prepare contract data for AI
      const contractDataForAI = {
        id: contractId,
        title: contractData.title || "Contract",
        clientName: extractedData.clientName || clientName || "",
        clientEmail: extractedData.clientEmail || clientEmail || "",
        clientCompany: extractedData.clientCompany || "",
        paymentTerms: extractedData.paymentTerms || "Net 30 days",
        totalAmount: extractedData.totalAmount || "",
        currency: "USD",
        contractContentText: contractContentText,
      };

      // Call the generate invoice API
      const response = await fetch("/api/generateInvoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractData: contractDataForAI,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate invoice");
      }

      const data = await response.json();
      console.log("🔍 SendStage - Full API response:", data);

      if (data && data.title) {
        // Generate a unique ID for the invoice
        const generatedId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

        const invoiceData = {
          id: generatedId,
          userId: auth.currentUser.uid,
          title: data.title || "Untitled Invoice",
          status: "draft" as const,
          issueDate: data.issueDate || undefined,
          dueDate: data.dueDate || undefined,
          currency: data.currency || "USD",
          client: data.client || {},
          from: data.from || {},
          items: data.items || [],
          subtotal: data.subtotal || 0,
          tax: data.tax || 0,
          total: data.total || 0,
          notes: data.notes || "",
          contractId: contractId, // Link invoice to the contract
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Save the invoice to Firestore
        console.log("💾 SendStage - Saving invoice to Firestore:", invoiceData);
        await saveInvoice(invoiceData);

        toast.success("Invoice generated successfully!");

        // Navigate to the invoice edit page
        router.push(`/Invoices/${generatedId}/edit`);
      } else {
        throw new Error(data.error || "Failed to generate invoice");
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate invoice"
      );
    } finally {
      setIsGeneratingInvoice(false);
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

      {/* Generate Invoice Button */}
      <button
        onClick={handleGenerateInvoice}
        disabled={isGeneratingInvoice}
        className="mb-3 w-full py-2 px-4 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingInvoice ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Generate Invoice
          </>
        )}
      </button>

      <button
        onClick={handlePreview}
        className="mb-3 w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Preview
      </button>

      <button
        onClick={handleDownloadPDF}
        className="mb-6 w-full py-2 px-4 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
      >
        <ArrowDownTrayIcon className="h-5 w-5" />
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
