"use client";

import { useState } from "react";
import { HeroChat } from "@/components/solar/HeroChat";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { saveContract, saveInvoice } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTutorial } from "@/lib/hooks/useTutorial";
import { useAccountLimits } from "@/lib/hooks/useAccountLimits";
import toast from "react-hot-toast";
import {
  doc,
  getFirestore,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { collection } from "firebase/firestore";

export interface FormData {
  projectBrief: string;
  techStack: string;
  startDate: string;
  endDate: string;
  budget?: string;
  attachments: File[];
  pdf?: string;
  fileSummaries: { [key: string]: string };
}

interface FormParentProps {
  formData: FormData;
  setFormData: (data: FormData) => void;
  onStageChange: (stage: number) => void;
}

const FormParent: React.FC<FormParentProps> = ({
  formData,
  setFormData,
  onStageChange,
}) => {
  const [currentStage, setCurrentStage] = useState(1);
  const router = useRouter();
  const TOTAL_STAGES = 1;
  const [isLoading, setIsLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [documentType, setDocumentType] = useState<"contract" | "invoice">(
    "contract"
  );
  const { user } = useAuth();
  const { trackAction } = useTutorial();
  const accountLimits = useAccountLimits();

  // Load contracts for invoice generation
  useEffect(() => {
    const loadContracts = async () => {
      if (!user) return;

      try {
        const db = getFirestore();
        const contractsRef = collection(db, "contracts");
        const contractsQuery = query(
          contractsRef,
          where("userId", "==", user.uid)
        );
        const contractsSnapshot = await getDocs(contractsQuery);
        const contractsData = contractsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContracts(contractsData);
      } catch (error) {
        console.error("Error loading contracts:", error);
      }
    };

    loadContracts();
  }, [user]);

  // Sync document type with localStorage
  useEffect(() => {
    const storedType = localStorage.getItem("hero-request-type") as
      | "contract"
      | "invoice";
    if (storedType) {
      setDocumentType(storedType);
    }
  }, []);

  useEffect(() => {
    router.prefetch("/Contracts/[id]");

    const handleHeroData = async () => {
      // Check for project brief from hero chat
      const heroProjectBrief = localStorage.getItem("hero-project-brief");
      const heroFileReferences = localStorage.getItem("hero-file-references");
      const heroAttachmentCount = localStorage.getItem("hero-attachment-count");

      if (heroProjectBrief && !formData.projectBrief) {
        const updates: Partial<FormData> = {
          projectBrief: heroProjectBrief,
        };

        // Handle hero attachments if they exist
        if (heroFileReferences && formData.attachments.length === 0) {
          try {
            const fileReferences = JSON.parse(heroFileReferences);
            const restoredFiles: File[] = [];

            // Restore files from sessionStorage
            for (const ref of fileReferences) {
              const fileData = sessionStorage.getItem(ref.sessionKey);
              if (fileData) {
                // Convert base64 back to File
                const response = await fetch(fileData);
                const blob = await response.blob();
                const file = new File([blob], ref.name, {
                  type: ref.type,
                  lastModified: ref.lastModified,
                });
                restoredFiles.push(file);

                // Clean up sessionStorage
                sessionStorage.removeItem(ref.sessionKey);
              }
            }

            if (restoredFiles.length > 0) {
              updates.attachments = restoredFiles;
              toast.success(
                `${restoredFiles.length} file(s) restored from your initial request!`
              );
            }

            // Clean up file references
            localStorage.removeItem("hero-file-references");
          } catch (error) {
            console.error("Error restoring hero attachments:", error);
            // Fallback to notification if restoration fails
            if (heroAttachmentCount) {
              toast(
                `${heroAttachmentCount} file(s) were attached from your initial request. Please re-upload them if needed.`,
                { icon: "ℹ️" }
              );
            }
          }
        } else if (heroAttachmentCount && formData.attachments.length === 0) {
          // Show notification if no file references but attachment count exists
          toast(
            `${heroAttachmentCount} file(s) were attached from your initial request. Please re-upload them if needed.`,
            { icon: "ℹ️" }
          );
        }

        setFormData({
          ...formData,
          ...updates,
        });

        // Clear the stored data after using it
        localStorage.removeItem("hero-project-brief");
        localStorage.removeItem("hero-attachment-count");
      }
    };

    handleHeroData();
  }, [router, formData, setFormData]);

  const handleStageChange = (newStage: number) => {
    if (newStage > 0 && newStage <= TOTAL_STAGES) {
      setCurrentStage(newStage);
      onStageChange(newStage);
    }
  };

  const handleSubmit = async (override?: Partial<FormData>) => {
    if (!user) {
      toast.error("You must be logged in to create a contract");
      return;
    }

    // Use the current document type
    const requestType = documentType;

    // Check account limits based on request type
    console.log("🔍 Account limits check:", {
      loading: accountLimits.loading,
      requestType,
      contracts: accountLimits.contracts,
      invoices: accountLimits.invoices,
      isPro: accountLimits.isPro
    });
    
    if (!accountLimits.loading) {
      if (requestType === "contract" && !accountLimits.contracts.canCreate) {
        console.log("❌ Contract creation blocked - limit reached");
        toast.error(
          `You've reached the maximum number of contracts for the free tier (${accountLimits.contracts.limit}). Upgrade to Pro to create unlimited contracts.`
        );
        return;
      }
      if (requestType === "invoice" && !accountLimits.invoices.canCreate) {
        console.log("❌ Invoice creation blocked - limit reached");
        toast.error(
          `You've reached the maximum number of invoices for the free tier (${accountLimits.invoices.limit}). Upgrade to Pro to create unlimited invoices.`
        );
        return;
      }
    }

    setIsLoading(true);

    const loadingToast = toast.loading(
      requestType === "invoice"
        ? "Generating invoice..."
        : "Generating contract..."
    );
    const startTime = performance.now();

    try {
      console.log("Current user:", user);
      console.log("Form data:", formData);

      // Compose the effective payload combining state + any overrides (avoids stale state)
      const effective: FormData = {
        projectBrief: override?.projectBrief ?? formData.projectBrief,
        techStack: override?.techStack ?? formData.techStack,
        startDate: override?.startDate ?? formData.startDate,
        endDate: override?.endDate ?? formData.endDate,
        budget: override?.budget ?? formData.budget,
        attachments: override?.attachments ?? formData.attachments,
        pdf: override?.pdf ?? formData.pdf,
        fileSummaries: override?.fileSummaries ?? formData.fileSummaries,
      } as FormData;

      console.log("Submitting payload to generator:", {
        projectBrief: effective.projectBrief,
        attachments: effective.attachments?.map((f) => f.name),
        summaries: effective.fileSummaries,
      });

      // Generate a new document reference with auto-generated ID
      const db = getFirestore();
      const isInvoice = requestType === "invoice";
      const ref = doc(collection(db, isInvoice ? "invoices" : "contracts"));
      const generatedId = ref.id;

      // Update loading message
      toast.loading(
        isInvoice
          ? "Generating invoice content with AI..."
          : "Generating contract content with AI...",
        {
          id: loadingToast,
        }
      );

      // Generate contract content using OpenAI with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const aiStartTime = performance.now();
      const debugMode =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("debug") === "1";

      // Build attachments payload; optionally inject a mock summary in debug mode
      const payloadAttachments = effective.attachments.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        summary: effective.fileSummaries?.[file.name],
      }));

      if (debugMode) {
        payloadAttachments.push({
          name: "MOCK_DEBUG",
          type: "text/plain",
          size: 0,
          lastModified: Date.now(),
          summary:
            "MOCK SUMMARY: prioritize details about a specialty coffee shop business model in Girona, pricing, and timeline from uploaded docs and brief.",
        } as any);
      }

      // Fetch user settings and contract data for invoice generation
      let userSettings = null;
      let contractData = null;
      if (isInvoice && user) {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userSettings = {
              contract: userData.contractSettings || {},
              invoice: userData.invoiceSettings || {},
            };
          }

          // Fetch contract data if a contract is selected
          if (selectedContractId) {
            const contractDoc = await getDoc(
              doc(db, "contracts", selectedContractId)
            );
            if (contractDoc.exists()) {
              const contractDocData = contractDoc.data();
              contractData = {
                id: contractDoc.id,
                title:
                  contractDocData.title ||
                  contractDocData.content?.blocks?.[0]?.data?.text ||
                  "Contract",
                clientName: contractDocData.clientName || "",
                clientEmail: contractDocData.clientEmail || "",
                clientCompany: contractDocData.clientCompany || "",
                paymentTerms: contractDocData.paymentTerms || "Net 30 days",
                totalAmount:
                  contractDocData.budget || contractDocData.totalAmount || "",
                currency: contractDocData.currency || "USD",
              };
            }
          }
        } catch (error) {
          console.log("Failed to load user settings or contract data:", error);
        }
      }

      const response = await fetch(
        isInvoice ? "/api/generateInvoice" : "/api/generateContract",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectBrief: effective.projectBrief,
            techStack: isInvoice ? undefined : effective.techStack,
            startDate: isInvoice ? undefined : effective.startDate,
            endDate: isInvoice ? undefined : effective.endDate,
            budget: isInvoice ? undefined : effective.budget,
            currency: "USD",
            pdf: isInvoice ? undefined : effective.pdf,
            debug: debugMode,
            attachments: payloadAttachments,
            userSettings: isInvoice ? userSettings : undefined,
            contractData: isInvoice ? contractData : undefined,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const aiEndTime = performance.now();
      console.log(
        `AI generation took ${Math.round(aiEndTime - aiStartTime)}ms`
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(
          data.error ||
            (isInvoice
              ? "Failed to generate invoice"
              : "Failed to generate contract")
        );
      }

      if (!isInvoice) {
        if (!data.blocks) {
          console.error("No blocks in response:", data);
          throw new Error("No contract content generated");
        }
      } else {
        if (
          !data.items ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("No invoice items generated");
        }
      }

      // Update loading message
      toast.loading(
        isInvoice
          ? "Saving invoice to database..."
          : "Saving contract to database...",
        { id: loadingToast }
      );

      const dbStartTime = performance.now();
      let redirectUrl = "";
      if (!isInvoice) {
        const contractData = {
          id: generatedId,
          userId: user.uid,
          title:
            data.blocks?.[0]?.type === "header"
              ? data.blocks[0].data.text
              : data.blocks?.[0]?.type === "paragraph"
                ? data.blocks[0].data.text.substring(0, 50) +
                  (data.blocks[0].data.text.length > 50 ? "..." : "")
                : "Untitled Contract",
          content: {
            time: Date.now(),
            blocks: data.blocks,
            version: "2.28.2",
          },
          rawContent: {
            projectBrief: effective.projectBrief || "",
            techStack: effective.techStack || "The tech stack includes ",
            startDate: effective.startDate || "",
            endDate: effective.endDate || "",
            budget: effective.budget || "",
            pdf: effective.pdf || "",
            attachments: await Promise.all(
              (effective.attachments || []).map(async (file) => ({
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified,
                summary: effective.fileSummaries?.[file.name],
              }))
            ),
          },
          status: "draft" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };

        console.log("Saving contract with data:", contractData);
        const result = await saveContract(contractData);
        const dbEndTime = performance.now();
        console.log(
          `Database save took ${Math.round(dbEndTime - dbStartTime)}ms`
        );

        if (result.error) {
          console.error("Error saving contract:", result.error);
          toast.error(result.error, { id: loadingToast });
        } else {
          console.log("Contract saved successfully:", result);

          // Track tutorial action
          trackAction("contract_created");

          // Save to localStorage before redirecting
          localStorage.setItem(
            `contract-content-${generatedId}`,
            JSON.stringify({
              time: Date.now(),
              blocks: data.blocks,
              version: "2.28.2",
            })
          );

          const totalTime = performance.now() - startTime;
          console.log(
            `Total contract generation took ${Math.round(totalTime)}ms`
          );

          toast.success(
            `Contract created successfully! (${Math.round(totalTime)}ms)`,
            { id: loadingToast }
          );
          redirectUrl = `/Contracts/${generatedId}`;
        }
      } else {
        // Save invoice
        const subtotal = Array.isArray(data.items)
          ? data.items.reduce(
              (sum: number, item: any) => sum + (Number(item.total) || 0),
              0
            )
          : 0;
        const tax = typeof data.tax === "number" ? data.tax : 0;
        const total =
          typeof data.total === "number" ? data.total : subtotal + tax;

        const invoiceData = {
          id: generatedId,
          userId: user.uid,
          title: data.title || "Untitled Invoice",
          status: "draft" as const,
          issueDate: data.issueDate || undefined,
          dueDate: data.dueDate || undefined,
          currency: data.currency || "USD",
          client: data.client || {},
          from: data.from || {},
          items: data.items || [],
          subtotal,
          tax,
          total,
          notes: data.notes || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log("Saving invoice with data:", invoiceData);
        const result = await saveInvoice(invoiceData as any);
        const dbEndTime = performance.now();
        console.log(
          `Database save took ${Math.round(dbEndTime - dbStartTime)}ms`
        );

        if ((result as any).error) {
          console.error("Error saving invoice:", (result as any).error);
          toast.error((result as any).error, { id: loadingToast });
        } else {
          const totalTime = performance.now() - startTime;
          toast.success(
            `Invoice created successfully! (${Math.round(totalTime)}ms)`,
            { id: loadingToast }
          );
          redirectUrl = `/Invoices/${generatedId}/edit`;
        }
      }
      if (redirectUrl) {
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          router.push(redirectUrl);
        }, 100);
      }
    } catch (error: any) {
      console.error("Error creating contract:", error);

      const totalTime = performance.now() - startTime;
      console.log(
        `Contract generation failed after ${Math.round(totalTime)}ms`
      );

      // Handle timeout errors specifically
      if (error.name === "AbortError") {
        toast.error("Contract generation timed out. Please try again.", {
          id: loadingToast,
        });
      } else {
        toast.error(
          error instanceof Error ? error.message : "Failed to create contract",
          { id: loadingToast }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (
    processedFiles: Array<{ file: File; summary?: string }>
  ) => {
    const newSummaries = { ...formData.fileSummaries };
    processedFiles.forEach((pf) => {
      if (pf.summary) {
        newSummaries[pf.file.name] = pf.summary;
      }
    });

    setFormData({
      ...formData,
      attachments: [
        ...formData.attachments,
        ...processedFiles.map((pf) => pf.file),
      ],
      fileSummaries: newSummaries,
    });
  };

  const handleDeleteFile = (index: number) => {
    const fileToDelete = formData.attachments[index];
    const updatedAttachments = formData.attachments.filter(
      (_, i) => i !== index
    );
    const updatedSummaries = { ...formData.fileSummaries };
    if (fileToDelete && updatedSummaries[fileToDelete.name]) {
      delete updatedSummaries[fileToDelete.name];
    }

    setFormData({
      ...formData,
      attachments: updatedAttachments,
      fileSummaries: updatedSummaries,
    });
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="relative">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Creating contract...</span>
        </div>
      ) : (
        <div className="w-full">
          <HeroChat
            initialMessage={formData.projectBrief}
            showDocumentTypeToggle={true}
            onDocumentTypeChange={setDocumentType}
            onFilesProcessed={(processed) => {
              if (processed && processed.length > 0) {
                handleFileUpload(
                  processed.map((p) => ({ file: p.file, summary: p.summary }))
                );
              }
            }}
            additionalFields={
              <div className="space-y-4">
                {/* Contract Selection for Invoices Only */}
                {(() => {
                  if (documentType === "invoice" && contracts.length > 0) {
                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Use existing contract for client details
                        </label>
                        <select
                          value={selectedContractId}
                          onChange={(e) =>
                            setSelectedContractId(e.target.value)
                          }
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="">Select a contract (optional)</option>
                          {contracts.map((contract) => {
                            // Get contract title from content blocks or use fallback
                            const contractTitle =
                              contract.content?.blocks?.[0]?.data?.text ||
                              contract.title ||
                              `Contract ${contract.id.slice(0, 8)}`;
                            return (
                              <option key={contract.id} value={contract.id}>
                                {contractTitle}
                              </option>
                            );
                          })}
                        </select>
                        {selectedContractId && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-xs text-green-700">
                              ✓ Contract selected - client details will be
                              populated automatically
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Estimated start
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        handleDateChange("startDate", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Estimated end
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        handleDateChange("endDate", e.target.value)
                      }
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Budget (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 5000"
                      value={formData.budget || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, budget: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                </div>
              </div>
            }
            onSubmit={async (message: string, files: File[]) => {
              setFormData({ ...formData, projectBrief: message });

              let processedSummaries: Record<string, string> = {};
              if (files && files.length > 0) {
                try {
                  const results = await Promise.all(
                    files.map(async (file) => {
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/process-document", {
                          method: "POST",
                          body: fd,
                        });
                        const data = await res.json();
                        if (data?.summary) {
                          processedSummaries[file.name] = data.summary;
                        }
                      } catch (e) {
                        // ignore per-file errors
                      }
                    })
                  );
                } catch {}
              }

              // Merge attachments and summaries
              const mergedSummaries = {
                ...formData.fileSummaries,
                ...processedSummaries,
              };

              const existingNames = new Set(
                (formData.attachments || []).map((f) => f.name)
              );
              const mergedAttachments = [
                ...formData.attachments,
                ...files.filter((f) => !existingNames.has(f.name)),
              ];

              await handleSubmit({
                projectBrief: message,
                attachments: mergedAttachments,
                fileSummaries: mergedSummaries,
              } as Partial<FormData>);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FormParent;
