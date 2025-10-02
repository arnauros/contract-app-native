"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { app, db } from "@/lib/firebase/firebase";
import DashboardStats from "@/app/Components/DashboardStats";
import CommentFeed from "@/app/Components/CommentFeed";
import useRecentComments from "@/lib/hooks/useRecentComments";
import { isLocalDevelopment } from "@/lib/utils";
import {
  collection,
  query,
  getDocs,
  Firestore,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  where,
  updateDoc,
  getFirestore,
} from "firebase/firestore";
import {
  FiFileText,
  FiClock,
  FiCheck,
  FiAlertCircle,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiExternalLink,
  FiRefreshCw,
  FiDownload,
  FiUser,
} from "react-icons/fi";
import { IconType } from "react-icons";
import toast from "react-hot-toast";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import Link from "next/link";
import { UserSubscription } from "@/lib/stripe/config";
import DebugClaims from "@/app/Components/DebugClaims";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Removed mock subscription helper - using real Stripe
import { getAuth } from "firebase/auth";
import FormParent, {
  FormData,
} from "@/app/Components/StepsComponents/formparent";
import Modal from "@/app/Components/Modal";
import StripeSetupGuide from "@/components/StripeSetupGuide";
import { useTutorial, useTutorialActions } from "@/lib/hooks/useTutorial";
import { useAccountLimits } from "@/lib/hooks/useAccountLimits";

interface StatCardProps {
  title: string;
  value: number;
  icon: IconType;
  color: string;
}

interface Contract {
  id: string;
  userId?: string;
  title?: string;
  content?: {
    clientName?: string;
    clientEmail?: string;
    projectBrief?: string;
    techStack?: string;
    startDate?: string;
    endDate?: string;
    blocks?: Array<{
      type: string;
      data: {
        text: string;
        level?: number;
        items?: string[];
      };
    }>;
  };
  status?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientSignature?: boolean;
  mySignature?: boolean;
}

// Add the StatCard component implementation
const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center">
        <div className={`rounded-full p-2.5 mr-4 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">{title}</dt>
          <dd className="text-2xl font-medium tracking-tight text-gray-900 mt-1">
            {value}
          </dd>
        </div>
      </div>
    </div>
  );
};

// Mock Stripe Portal Component removed - using real Stripe customer portal

// Add conditional logging to prevent duplicate logs in development
const logDebug = (...args: any[]) => {
  // Use a timestamp-based deduplication to avoid double logs in React StrictMode
  const logKey = JSON.stringify(args);
  if (!window._logCache) {
    window._logCache = {};
  }
  const now = Date.now();
  if (!window._logCache[logKey] || now - window._logCache[logKey] > 1000) {
    window._logCache[logKey] = now;
    console.log(...args);
  }
};

// Add this to the window interface
declare global {
  interface Window {
    _logCache?: Record<string, number>;
  }
}

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

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Tutorial system
  const { tutorialState, shouldShow, updateTutorialState, trackAction } =
    useTutorial();
  const { refreshLimits, ...accountLimits } = useAccountLimits();
  const [stats, setStats] = useState({
    total: 0,
    pendingClient: 0,
    pendingMe: 0,
    completed: 0,
  });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);
  const [isBulkDeleteContractsModalOpen, setIsBulkDeleteContractsModalOpen] =
    useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkDeleteInvoicesModalOpen, setIsBulkDeleteInvoicesModalOpen] =
    useState(false);
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] =
    useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Get recent comments from all contracts
  const { comments, loading: commentsLoading } = useRecentComments(10);

  // Add a flag to disable comments functionality
  const COMMENTS_ENABLED = false;
  // Toggle for showing debug tools section
  const DEBUG_TOOLS_ENABLED = false;

  // Add state for FormParent (copied from /new)
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    projectBrief: "",
    techStack: "The tech stack includes ",
    startDate: "",
    endDate: "",
    budget: "",
    attachments: [],
    fileSummaries: {},
  });

  // Check for project brief from hero chat on mount
  useEffect(() => {
    const heroProjectBrief = localStorage.getItem("hero-project-brief");
    if (heroProjectBrief && !formData.projectBrief) {
      setFormData((prev) => ({
        ...prev,
        projectBrief: heroProjectBrief,
      }));
      // Clear the stored brief after using it
      localStorage.removeItem("hero-project-brief");
    }
  }, []);

  // Track tutorial actions
  useEffect(() => {
    // Track when contracts are viewed
    if (contracts.length > 0) {
      trackAction("contracts_viewed");
    }
  }, [contracts, trackAction]);

  // Handler for FormParent (no-op for now, or you can copy from /new)
  const handleFormParentSubmit = () => {};

  // Handler for FormParent setFormData
  const handleFormDataChange = (
    data: FormData | ((prev: FormData) => FormData)
  ) => {
    if (typeof data === "function") {
      setFormData(data);
    } else {
      setFormData(data);
    }
  };

  // Simplified auth check and data loading
  useEffect(() => {
    // Debug output - use logDebug instead of console.log
    logDebug("Dashboard auth state:", { user: !!user, loading });

    // If not logged in and not loading, redirect to login
    if (!user && !loading) {
      logDebug("User not authenticated, redirecting to login");
      router.push("/login");
    }

    // If authenticated, load data with a small delay to prioritize FormParent
    if (user && !loading) {
      logDebug("User authenticated, fetching data");
      // Add a small delay to prioritize FormParent rendering
      setTimeout(() => {
        fetchContractData();
      }, 100);
    }
  }, [user, loading]);

  const fetchContractData = async () => {
    if (!user || !db) {
      logDebug("No user or db:", { user, db });
      setIsLoading(false);
      return;
    }

    try {
      logDebug("Fetching contracts for user:", user.uid);
      const firestore = db as unknown as Firestore;
      const contractsRef = collection(firestore, "contracts");

      // Filter contracts by the current user's ID to ensure proper permissions
      const userContracts = query(
        contractsRef,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(userContracts);
      logDebug("Found contracts:", querySnapshot.size);

      let stats = {
        total: 0,
        pendingClient: 0,
        pendingMe: 0,
        completed: 0,
      };

      const contractsList: Contract[] = [];

      // Process each contract
      for (const docSnapshot of querySnapshot.docs) {
        try {
          const data = docSnapshot.data();
          logDebug("Contract data:", { id: docSnapshot.id, ...data });

          // Only include contracts for the current user (redundant with where clause but kept for safety)
          if (data.userId === user.uid) {
            // Get signatures for this contract
            const designerSignatureRef = doc(
              firestore,
              "contracts",
              docSnapshot.id,
              "signatures",
              "designer"
            );
            const clientSignatureRef = doc(
              firestore,
              "contracts",
              docSnapshot.id,
              "signatures",
              "client"
            );

            let designerSignature;
            let clientSignature;

            try {
              [designerSignature, clientSignature] = await Promise.all([
                getDoc(designerSignatureRef),
                getDoc(clientSignatureRef),
              ]);
            } catch (signatureError) {
              logDebug("Error fetching signatures:", signatureError);
              designerSignature = { exists: () => false };
              clientSignature = { exists: () => false };
            }

            const contract: Contract = {
              ...data,
              id: docSnapshot.id,
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || Timestamp.now(),
              content: data.content || {},
              status: data.status || "draft",
              mySignature: designerSignature.exists(),
              clientSignature: clientSignature.exists(),
            };

            stats.total++;

            // Use the actual contract status from Firestore, but fallback to signature-based logic
            const actualStatus = contract.status;

            if (actualStatus === "signed") {
              stats.completed++;
              contract.status = "signed";
            } else if (actualStatus === "pending") {
              stats.pendingClient++;
              contract.status = "pending";
            } else {
              // Fallback to signature-based logic for contracts without explicit status
              if (designerSignature.exists() && clientSignature.exists()) {
                stats.completed++;
                contract.status = "signed";
              } else if (designerSignature.exists()) {
                stats.pendingClient++;
                contract.status = "pending";
              } else {
                stats.pendingMe++;
                contract.status = "draft";
              }
            }

            contractsList.push(contract);
          }
        } catch (contractError) {
          logDebug("Error processing contract:", contractError);
          // Continue processing other contracts
        }
      }

      logDebug("Processed contracts:", {
        total: contractsList.length,
        stats,
      });

      setStats(stats);
      setContracts(contractsList);

      // Fetch invoices for this user using a more efficient approach
      try {
        console.log(`Fetching invoices for user: ${user.uid}`);

        // Try to get invoices using a direct query first
        try {
          const invoicesRef = collection(firestore, "invoices");
          const userInvoices = query(
            invoicesRef,
            where("userId", "==", user.uid)
          );
          const invoicesSnap = await getDocs(userInvoices);
          const list: any[] = [];

          invoicesSnap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, ...data });
          });

          // Sort by createdAt manually
          list.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bTime.getTime() - aTime.getTime();
          });

          console.log(`Fetched ${list.length} invoices for user ${user.uid}`);
          setInvoices(list);
        } catch (queryError) {
          console.log("Query failed, trying alternative approach:", queryError);

          // Fallback: try to read individual invoices if we know their IDs
          // For now, just set empty array and let the user know
          console.log(
            "Invoice query failed - user may need subscription_debug flag set"
          );
          setInvoices([]);
        }
      } catch (e) {
        console.log("Invoice fetch failed", e);
        setInvoices([]);
      }

      setIsLoading(false);

      // NOTE: Skip legacy dev-only top-level `subscriptions` query to avoid
      // Firestore permission-denied errors. We already listen to
      // `users/{uid}` for subscription changes below, which is authoritative.
      // If you really need this fetch in the future, gate it behind a feature
      // flag and add matching security rules for `/subscriptions`.
    } catch (error) {
      logDebug("Error fetching contract data:", error);
      toast.error("Failed to load contracts. Please try again later.");
      setIsLoading(false);
      // Set default values to ensure UI doesn't break
      setStats({
        total: 0,
        pendingClient: 0,
        pendingMe: 0,
        completed: 0,
      });
      setContracts([]);
      setInvoices([]);
    }
  };

  // Add a subscription tracking effect
  useEffect(() => {
    if (loading || !user || !db) return;

    // Listen for subscription changes
    const userDocRef = doc(db as Firestore, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnapshot) => {
        const userData = docSnapshot.data();
        setSubscription(userData?.subscription || null);
      },
      (error) => {
        console.error("Error getting subscription:", error);
      }
    );

    return () => unsubscribe();
  }, [user, loading, db]);

  const filteredContracts = contracts.filter((contract) => {
    if (filter === "all") return true;
    if (filter === "pending_client")
      return contract.status === "pending" && !contract.clientSignature;
    if (filter === "pending_me")
      return contract.status === "pending" && !contract.mySignature;
    if (filter === "completed") return contract.status === "signed";
    return true;
  });

  const handleDeleteContract = async (contractId: string) => {
    try {
      if (!db) throw new Error("Firebase not initialized");
      await deleteDoc(doc(db as Firestore, "contracts", contractId));
      setContracts(contracts.filter((c) => c.id !== contractId));
      // Refresh account limits after deletion
      refreshLimits();
      toast.success("Contract deleted successfully");
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    }
  };

  const confirmDeleteContract = async () => {
    if (!contractToDelete) return;
    await handleDeleteContract(contractToDelete);
    setIsDeleteModalOpen(false);
    setContractToDelete(null);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      if (!db) throw new Error("Firebase not initialized");
      await deleteDoc(doc(db as Firestore, "invoices", invoiceId));
      setInvoices(invoices.filter((i) => i.id !== invoiceId));
      // Refresh account limits after deletion
      refreshLimits();
      toast.success("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    await handleDeleteInvoice(invoiceToDelete);
    setIsDeleteInvoiceModalOpen(false);
    setInvoiceToDelete(null);
  };

  // Bulk selection helpers for contracts
  const toggleSelectAllContracts = () => {
    const allIds = filteredContracts.map((c) => c.id);
    if (selectedContractIds.length === allIds.length) {
      setSelectedContractIds([]);
    } else {
      setSelectedContractIds(allIds);
    }
  };

  const toggleContractSelection = (id: string) => {
    setSelectedContractIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteContracts = async () => {
    try {
      if (!db) throw new Error("Firebase not initialized");
      const firestore = db as Firestore;
      await Promise.all(
        selectedContractIds.map((id) =>
          deleteDoc(doc(firestore, "contracts", id))
        )
      );
      setContracts(
        contracts.filter((c) => !selectedContractIds.includes(c.id))
      );
      setSelectedContractIds([]);
      toast.success("Selected contracts deleted");
    } catch (error) {
      console.error("Bulk delete contracts error:", error);
      toast.error("Failed to delete selected contracts");
    }
  };

  const confirmBulkDeleteContracts = async () => {
    await handleBulkDeleteContracts();
    setIsBulkDeleteContractsModalOpen(false);
  };

  const handleDownloadPDF = async (contractId: string) => {
    try {
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

      // 2. Fall back to localStorage if needed
      if (!designerSignature) {
        const savedDesignerSignature = localStorage.getItem(
          `contract-designer-signature-${contractId}`
        );
        if (savedDesignerSignature) {
          try {
            const parsedData = JSON.parse(savedDesignerSignature);
            designerSignature = parsedData.signature || "";
            designerName = parsedData.name || "Designer";
            designerDate = parsedData.signedAt
              ? new Date(parsedData.signedAt).toLocaleDateString()
              : new Date().toLocaleDateString();
          } catch (e) {
            console.error(
              "Error parsing designer signature from localStorage:",
              e
            );
          }
        } else {
          // Legacy fallback
          designerSignature = localStorage.getItem("contract-signature") || "";
          designerName = user?.displayName || "Designer";
          designerDate = new Date().toLocaleDateString();
        }
      }

      if (!clientSignature) {
        const savedClientSignature = localStorage.getItem(
          `client-signature-${contractId}`
        );
        if (savedClientSignature) {
          try {
            const parsedData = JSON.parse(savedClientSignature);
            clientSignature = parsedData.signature || "";
            clientName = parsedData.name || "Client";
            clientDate = parsedData.signedAt
              ? new Date(parsedData.signedAt).toLocaleDateString()
              : "";
          } catch (e) {
            console.error(
              "Error parsing client signature from localStorage:",
              e
            );
          }
        }
      }

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

      // Import jsPDF dynamically to avoid server-side rendering issues
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

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

  const handleDownloadInvoicePDF = async (invoiceId: string) => {
    try {
      // Display loading toast
      const loadingToast = toast.loading("Generating PDF...");

      // Get the invoice data from Firestore
      const firestore = getFirestore();
      const invoiceRef = doc(firestore, "invoices", invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (!invoiceSnap.exists()) {
        toast.dismiss(loadingToast);
        toast.error("Invoice not found");
        return;
      }

      const invoiceData = invoiceSnap.data();

      // Import jsPDF dynamically to avoid server-side rendering issues
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      // Create a new PDF document
      const pdf = new jsPDF();
      let yPosition = 10;

      // Add a title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(invoiceData.title || "Invoice", 105, yPosition, {
        align: "center",
      });
      yPosition += 20;

      // Add invoice details
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      const margin = 20;
      const pageWidth = pdf.internal.pageSize.width - margin * 2;

      // Invoice number and dates
      if (invoiceData.issueDate) {
        pdf.text(
          `Issue Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}`,
          margin,
          yPosition
        );
        yPosition += 10;
      }
      if (invoiceData.dueDate) {
        pdf.text(
          `Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`,
          margin,
          yPosition
        );
        yPosition += 10;
      }
      yPosition += 10;

      // From and To sections
      if (invoiceData.from) {
        pdf.setFont("helvetica", "bold");
        pdf.text("From:", margin, yPosition);
        yPosition += 8;
        pdf.setFont("helvetica", "normal");
        if (invoiceData.from.name)
          pdf.text(invoiceData.from.name, margin, yPosition);
        yPosition += 6;
        if (invoiceData.from.company)
          pdf.text(invoiceData.from.company, margin, yPosition);
        yPosition += 6;
        if (invoiceData.from.email)
          pdf.text(invoiceData.from.email, margin, yPosition);
        yPosition += 6;
        if (invoiceData.from.address)
          pdf.text(invoiceData.from.address, margin, yPosition);
        yPosition += 15;
      }

      if (invoiceData.client) {
        pdf.setFont("helvetica", "bold");
        pdf.text("To:", margin, yPosition);
        yPosition += 8;
        pdf.setFont("helvetica", "normal");
        if (invoiceData.client.name)
          pdf.text(invoiceData.client.name, margin, yPosition);
        yPosition += 6;
        if (invoiceData.client.company)
          pdf.text(invoiceData.client.company, margin, yPosition);
        yPosition += 6;
        if (invoiceData.client.email)
          pdf.text(invoiceData.client.email, margin, yPosition);
        yPosition += 6;
        if (invoiceData.client.address)
          pdf.text(invoiceData.client.address, margin, yPosition);
        yPosition += 15;
      }

      // Items table
      if (invoiceData.items && invoiceData.items.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Items:", margin, yPosition);
        yPosition += 10;

        // Table headers
        pdf.text("Description", margin, yPosition);
        pdf.text("Qty", margin + 100, yPosition);
        pdf.text("Price", margin + 130, yPosition);
        pdf.text("Total", margin + 160, yPosition);
        yPosition += 8;

        // Draw line under headers
        pdf.line(margin, yPosition, margin + 180, yPosition);
        yPosition += 5;

        pdf.setFont("helvetica", "normal");
        invoiceData.items.forEach((item: any) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 10;
          }

          const description = pdf.splitTextToSize(item.description || "", 90);
          pdf.text(description, margin, yPosition);
          pdf.text(String(item.quantity || 0), margin + 100, yPosition);
          pdf.text(
            new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: invoiceData.currency || "USD",
            }).format(item.unitPrice || 0),
            margin + 130,
            yPosition
          );
          pdf.text(
            new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: invoiceData.currency || "USD",
            }).format(item.total || 0),
            margin + 160,
            yPosition
          );
          yPosition += Math.max(6 * description.length, 8);
        });

        yPosition += 10;

        // Totals
        pdf.setFont("helvetica", "bold");
        pdf.text("Subtotal:", margin + 130, yPosition);
        pdf.text(
          new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: invoiceData.currency || "USD",
          }).format(invoiceData.subtotal || 0),
          margin + 160,
          yPosition
        );
        yPosition += 8;

        if (invoiceData.tax) {
          pdf.text("Tax:", margin + 130, yPosition);
          pdf.text(
            new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: invoiceData.currency || "USD",
            }).format(invoiceData.tax),
            margin + 160,
            yPosition
          );
          yPosition += 8;
        }

        pdf.setFontSize(14);
        pdf.text("Total:", margin + 130, yPosition);
        pdf.text(
          new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: invoiceData.currency || "USD",
          }).format(invoiceData.total || 0),
          margin + 160,
          yPosition
        );
      }

      // Notes
      if (invoiceData.notes) {
        yPosition += 20;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text("Notes:", margin, yPosition);
        yPosition += 8;
        pdf.setFont("helvetica", "normal");
        const notes = pdf.splitTextToSize(invoiceData.notes, pageWidth);
        pdf.text(notes, margin, yPosition);
      }

      // Save the PDF
      pdf.save(`invoice-${invoiceId}.pdf`);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "text-gray-500";

    switch (status) {
      case "draft":
        return "text-yellow-500";
      case "pending":
        return "text-orange-500";
      case "signed":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusText = (status: string | undefined) => {
    if (!status) return "Draft";

    switch (status) {
      case "draft":
        return "Draft";
      case "pending":
        return "Pending Signatures";
      case "signed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasActiveSubscription = subscription?.status === "active";
  const isCanceledSubscription = subscription?.status === "canceled";

  // Fix the searchParams null issue
  const searchParams = useSearchParams();
  // Removed mock portal logic - using real Stripe customer portal
  const subscriptionCanceled = searchParams?.get("subscription") === "canceled";
  const subscriptionUpgraded = searchParams?.get("subscription") === "upgraded";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Setup Guide - Show when tutorial should be shown */}
      {shouldShow && tutorialState ? (
        <StripeSetupGuide
          tutorialState={tutorialState}
          onStateChange={updateTutorialState}
        />
      ) : null}

      {/* User info moved to topbar */}
      <div className="mb-6" />

      {/* Talon Logo for Free Accounts */}
      {!accountLimits.isPro && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
            <span className="font-bold text-gray-800">Talon</span>
          </div>
        </div>
      )}

      {/* Personalized greeting above the form */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800">
          Hello, {user?.displayName || user?.email?.split("@")[0] || "there"} 👋
        </h1>
        <p className="text-lg text-gray-500 mt-2">How can I help you today?</p>
      </div>
      {/* Input field from /new, now at the top of dashboard */}
      <div className="bg-white rounded-lg p-6 mb-10">
        <FormParent
          onStageChange={setCurrentStep}
          formData={formData}
          setFormData={handleFormDataChange}
        />
        {/* Single-step flow: remove step indicator */}
      </div>

      {/* Subscription status notification */}
      {subscriptionCanceled && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="font-medium">Your subscription has been canceled</p>
              <p className="text-sm">
                You will lose access when your current billing period ends.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription upgraded notification */}
      {subscriptionUpgraded && (
        <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiCheck className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="font-medium">
                Your subscription has been upgraded to yearly
              </p>
              <p className="text-sm">Thank you for your support!</p>
            </div>
          </div>
        </div>
      )}

      {/* Canceled subscription warning */}
      {isCanceledSubscription && !subscriptionCanceled && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="font-medium">Your subscription has been canceled</p>
              <p className="text-sm">
                Access will end on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                <Link href="/pricing" className="ml-1 underline">
                  Renew your subscription
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <StatCard
          title="Total Contracts"
          value={stats.total}
          icon={FiFileText}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Pending Client"
          value={stats.pendingClient}
          icon={FiClock}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Need Your Signature"
          value={stats.pendingMe}
          icon={FiEdit3}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={FiCheck}
          color="bg-green-100 text-green-600"
        />
      </div>

      {/* Limit maximum contracts for free tier */}
      {isLocalDevelopment() &&
        subscription?.tier === "free" &&
        stats.total >= 3 && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You've reached the maximum number of contracts for the free
                  tier.
                  <Link href="/pricing" className="font-medium underline ml-1">
                    Upgrade to Pro
                  </Link>
                  to create unlimited contracts.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Contract List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Your Contracts
            </h2>
          </div>
          {selectedContractIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <p className="text-sm text-gray-700">
                {selectedContractIds.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkDeleteContractsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 w-12 text-center align-middle sticky top-0 z-10 bg-gray-50">
                  <input
                    type="checkbox"
                    aria-label="Select all contracts"
                    checked={
                      filteredContracts.length > 0 &&
                      selectedContractIds.length === filteredContracts.length
                    }
                    onChange={toggleSelectAllContracts}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => router.push(`/Contracts/${contract.id}`)}
                  className="hover:bg-gray-50 transition-colors odd:bg-white even:bg-gray-50/30 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-center align-middle w-12">
                    <input
                      type="checkbox"
                      aria-label={`Select contract ${contract.id}`}
                      checked={selectedContractIds.includes(contract.id)}
                      onChange={() => toggleContractSelection(contract.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.content?.blocks?.[0]?.data?.text ||
                        contract.title ||
                        "Untitled Contract"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {!contract.content?.projectBrief &&
                      !contract.content?.startDate &&
                      !contract.content?.techStack &&
                      !contract.content?.clientName ? null : (
                        <>
                          {contract.content?.projectBrief
                            ? `Scope: ${contract.content.projectBrief.substring(
                                0,
                                12
                              )}...`
                            : ""}
                          {contract.content?.projectBrief &&
                          (contract.content?.startDate ||
                            contract.content?.techStack ||
                            contract.content?.clientName)
                            ? " • "
                            : ""}
                          {contract.content?.startDate &&
                          contract.content?.endDate
                            ? `$${
                                parseInt(
                                  contract.content.startDate.split("-")[2] ||
                                    "0"
                                ) * 100
                              }`
                            : ""}
                          {contract.content?.startDate &&
                          contract.content?.endDate &&
                          (contract.content?.techStack ||
                            contract.content?.clientName)
                            ? " • "
                            : ""}
                          {contract.content?.techStack || ""}
                          {contract.content?.clientName &&
                          (contract.content?.projectBrief ||
                            contract.content?.startDate ||
                            contract.content?.techStack)
                            ? ` • ${contract.content.clientName}`
                            : contract.content?.clientName
                              ? contract.content.clientName
                              : ""}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contract.createdAt.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                        contract.status === "draft"
                          ? "bg-yellow-50 text-yellow-700"
                          : contract.status === "pending"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                      }`}
                    >
                      {getStatusText(contract.status)}
                    </span>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/Contracts/${contract.id}`)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="View Contract"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(contract.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="Download PDF"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setContractToDelete(contract.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="Delete Contract"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredContracts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                No contracts found matching the selected filter.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Your Invoices</h2>
          </div>
          {selectedInvoiceIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <p className="text-sm text-gray-700">
                {selectedInvoiceIds.length} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkDeleteInvoicesModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 shadow-sm"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 w-12 text-center align-middle sticky top-0 z-10 bg-gray-50">
                  <input
                    type="checkbox"
                    aria-label="Select all invoices"
                    checked={
                      invoices.length > 0 &&
                      selectedInvoiceIds.length === invoices.length
                    }
                    onChange={() => {
                      if (selectedInvoiceIds.length === invoices.length) {
                        setSelectedInvoiceIds([]);
                      } else {
                        setSelectedInvoiceIds(invoices.map((i: any) => i.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Issued
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-10 bg-gray-50">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv: any) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/Invoices/${inv.id}/edit`)}
                  className="hover:bg-gray-50 transition-colors odd:bg-white even:bg-gray-50/30 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-center align-middle w-12">
                    <input
                      type="checkbox"
                      aria-label={`Select invoice ${inv.id}`}
                      checked={selectedInvoiceIds.includes(inv.id)}
                      onChange={() =>
                        setSelectedInvoiceIds((prev) =>
                          prev.includes(inv.id)
                            ? prev.filter((x) => x !== inv.id)
                            : [...prev, inv.id]
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {inv.title || "Untitled Invoice"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(inv.issueDate &&
                      new Date(inv.issueDate).toLocaleDateString()) ||
                      (inv.createdAt?.toDate
                        ? inv.createdAt.toDate().toLocaleDateString()
                        : "-")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                        inv.status === "paid"
                          ? "bg-green-50 text-green-700"
                          : inv.status === "overdue"
                            ? "bg-red-50 text-red-700"
                            : inv.status === "sent"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {inv.status
                        ? inv.status.charAt(0).toUpperCase() +
                          inv.status.slice(1)
                        : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: inv.currency || "USD",
                    }).format(typeof inv.total === "number" ? inv.total : 0)}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/Invoices/${inv.id}`)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="View Invoice"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoicePDF(inv.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="Download PDF"
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setInvoiceToDelete(inv.id);
                          setIsDeleteInvoiceModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                        title="Delete Invoice"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">
                No invoices yet. Generate one from the input above.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hide the comments section when comments are disabled */}
      {COMMENTS_ENABLED && (
        <section className="mt-8">
          <CommentFeed
            activities={comments}
            loading={commentsLoading}
            title="Recent Client Comments"
          />
        </section>
      )}

      {/* Debug section - temporary (hidden) */}
      {DEBUG_TOOLS_ENABLED && (
        <div className="mb-8 p-4 border border-orange-300 bg-orange-50 rounded-lg">
          <h2 className="text-lg font-semibold text-orange-700 mb-2">
            Troubleshooting: Firebase Permissions
          </h2>
          <p className="mb-4 text-orange-700">
            If you're seeing "Missing or insufficient permissions" errors, use
            the buttons below to reset your authentication claims.
          </p>
          <DebugClaims />

          {/* Add subscription debug link */}
          <div className="mt-4 pt-4 border-t border-orange-200">
            <p className="mb-2 text-orange-700">
              To verify your subscription status and cancellation:
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/subscription-debug"
                className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
              >
                <span className="mr-2">View Subscription Debug</span>
                <FiExternalLink size={14} />
              </Link>

              <button
                onClick={async () => {
                  try {
                    const loadingToast = toast.loading(
                      "Refreshing subscription..."
                    );
                    // Force a Firebase token refresh
                    const auth = getAuth();
                    if (auth.currentUser) {
                      await auth.currentUser.getIdToken(true);

                      // Call the reset-claims API
                      const response = await fetch("/api/debug/reset-claims", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ userId: auth.currentUser.uid }),
                      });

                      if (response.ok) {
                        // Get a fresh token with new claims
                        await auth.currentUser.getIdToken(true);
                        toast.dismiss(loadingToast);
                        toast.success(
                          "Subscription refreshed! Page will reload."
                        );

                        // Reload after a short delay
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      } else {
                        toast.dismiss(loadingToast);
                        toast.error("Failed to refresh subscription");
                      }
                    }
                  } catch (error) {
                    toast.error("Error refreshing subscription");
                    console.error(error);
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
              >
                <span className="mr-2">Fix Subscription</span>
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Stripe portal removed - using real Stripe customer portal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Contract"
        onConfirm={confirmDeleteContract}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <div className="p-1">
          <p className="text-gray-600">
            Are you sure you want to delete this contract? This action cannot be
            undone.
          </p>
        </div>
      </Modal>
      <Modal
        isOpen={isBulkDeleteContractsModalOpen}
        onClose={() => setIsBulkDeleteContractsModalOpen(false)}
        title="Delete Selected Contracts"
        onConfirm={confirmBulkDeleteContracts}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <div className="p-1">
          <p className="text-gray-600">
            Delete {selectedContractIds.length} selected contract(s)? This
            action cannot be undone.
          </p>
        </div>
      </Modal>
      <Modal
        isOpen={isBulkDeleteInvoicesModalOpen}
        onClose={() => setIsBulkDeleteInvoicesModalOpen(false)}
        title="Delete Selected Invoices"
        onConfirm={async () => {
          try {
            if (!db) throw new Error("Firebase not initialized");
            const firestore = db as Firestore;
            await Promise.all(
              selectedInvoiceIds.map((id) =>
                deleteDoc(doc(firestore, "invoices", id))
              )
            );
            setInvoices(
              invoices.filter((i: any) => !selectedInvoiceIds.includes(i.id))
            );
            setSelectedInvoiceIds([]);
            toast.success("Selected invoices deleted");
          } catch (e) {
            console.error(e);
            toast.error("Failed to delete selected invoices");
          } finally {
            setIsBulkDeleteInvoicesModalOpen(false);
          }
        }}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <div className="p-1">
          <p className="text-gray-600">
            Delete {selectedInvoiceIds.length} selected invoice(s)? This cannot
            be undone.
          </p>
        </div>
      </Modal>
      <Modal
        isOpen={isDeleteInvoiceModalOpen}
        onClose={() => setIsDeleteInvoiceModalOpen(false)}
        title="Delete Invoice"
        onConfirm={confirmDeleteInvoice}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <div className="p-1">
          <p className="text-gray-600">
            Are you sure you want to delete this invoice? This action cannot be
            undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
