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
import {
  XMarkIcon,
  PencilIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import jsPDF from "jspdf";

// Define a contract type with media properties
interface ContractWithMedia extends Contract {
  logoUrl?: string | null;
  bannerUrl?: string | null;
}

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
  const [clientSignature, setClientSignature] = useState<{
    signature: string;
    name: string;
    signedAt: Date | null;
  } | null>(null);
  const [designerSignature, setDesignerSignature] = useState<{
    signature: string;
    name: string;
    signedAt: Date | null;
  } | null>(null);
  const signaturePadRef = useRef<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");

  // Profile image and banner
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    "/placeholder-profile.png"
  );
  const [profileBannerUrl, setProfileBannerUrl] = useState<string>(
    "/placeholder-banner.png"
  );
  // Contract logo and banner
  const [logoUrl, setLogoUrl] = useState<string>("/placeholder-logo.png");
  const [bannerUrl, setBannerUrl] = useState<string>("/placeholder-banner.png");

  // Add scroll listener for floating button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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

        // Try to extract company name from metadata or user profile
        try {
          if (contractData.userId) {
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, "users", contractData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.companyName) {
                setCompanyName(userData.companyName);
              } else if (userData.displayName) {
                setCompanyName(userData.displayName);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching company name:", error);
        }

        // Check for logo and banner in contract data
        const contractWithMedia = contractData as ContractWithMedia;

        if (contractWithMedia.logoUrl) {
          setLogoUrl(contractWithMedia.logoUrl);
          // Save to localStorage for backup
          localStorage.setItem(
            `contract-logo-${id}`,
            contractWithMedia.logoUrl
          );
        } else {
          // Try to get from localStorage as fallback
          const savedLogo = localStorage.getItem(`contract-logo-${id}`);
          if (savedLogo) {
            setLogoUrl(savedLogo);
          }
        }

        if (contractWithMedia.bannerUrl) {
          setBannerUrl(contractWithMedia.bannerUrl);
          // Save to localStorage for backup
          localStorage.setItem(
            `contract-banner-${id}`,
            contractWithMedia.bannerUrl
          );
        } else {
          // Try to get from localStorage as fallback
          const savedBanner = localStorage.getItem(`contract-banner-${id}`);
          if (savedBanner) {
            setBannerUrl(savedBanner);
          }
        }

        // Load existing signatures
        const signaturesResult = await getSignatures(id);
        if (signaturesResult.success) {
          const { client, designer } = signaturesResult.signatures;

          if (client) {
            setClientSignature({
              signature: client.signature,
              name: client.name,
              signedAt: client.signedAt?.toDate?.() || null,
            });
          }

          if (designer) {
            setDesignerSignature({
              signature: designer.signature,
              name: designer.name,
              signedAt: designer.signedAt?.toDate?.() || null,
            });
          }
        }

        // Load user profile image and banner if contract has a userId
        if (contractData.userId) {
          try {
            // First try to get from localStorage for immediate display
            const profileImageKey = `profileImage-${contractData.userId}`;
            const profileBannerKey = `profileBanner-${contractData.userId}`;

            const savedProfileImage = localStorage.getItem(profileImageKey);
            const savedProfileBanner = localStorage.getItem(profileBannerKey);

            if (savedProfileImage) {
              setProfileImageUrl(savedProfileImage);
            }

            if (savedProfileBanner) {
              setProfileBannerUrl(savedProfileBanner);
            }

            // Then fetch from Firestore for most up-to-date data
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, "users", contractData.userId));

            if (userDoc.exists()) {
              const userData = userDoc.data();

              // Set profile image and banner if available
              if (userData.profileImageUrl) {
                setProfileImageUrl(userData.profileImageUrl);
                // Save to localStorage for future use
                localStorage.setItem(profileImageKey, userData.profileImageUrl);
              } else if (userData.defaultProfileImageUrl) {
                setProfileImageUrl(userData.defaultProfileImageUrl);
                localStorage.setItem(
                  profileImageKey,
                  userData.defaultProfileImageUrl
                );
              }

              if (userData.profileBannerUrl) {
                setProfileBannerUrl(userData.profileBannerUrl);
                localStorage.setItem(
                  profileBannerKey,
                  userData.profileBannerUrl
                );
              } else if (userData.defaultProfileBannerUrl) {
                setProfileBannerUrl(userData.defaultProfileBannerUrl);
                localStorage.setItem(
                  profileBannerKey,
                  userData.defaultProfileBannerUrl
                );
              }

              // Set company name if available
              if (userData.companyName && !companyName) {
                setCompanyName(userData.companyName);
              } else if (userData.displayName && !companyName) {
                setCompanyName(userData.displayName);
              }
            }
          } catch (error) {
            console.error("Error fetching user profile data:", error);
            // Non-critical error, just continue
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

      setClientSignature({
        signature: signatureImage,
        name: signerName,
        signedAt: new Date(),
      });

      setShowSignatureModal(false);
      toast.success("Contract signed successfully!");

      // Send notification to designer about client signature
      try {
        const { notifyDesignerClientSigned } = await import(
          "@/lib/email/notifications"
        );
        const notificationResult = await notifyDesignerClientSigned(
          id,
          signerName
        );
        if (notificationResult.success) {
          console.log("✅ Designer notified about client signature");
        } else {
          console.warn(
            "⚠️ Failed to notify designer:",
            notificationResult.error
          );
        }
      } catch (notificationError) {
        console.warn("⚠️ Error sending notification:", notificationError);
      }

      // Refresh page to update UI
      window.location.reload();
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Failed to sign contract. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  // Helper to render contract content with proper styling
  const renderContractContent = (content: any) => {
    // Handle string content with HTML
    if (typeof content === "string") {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    // Process the content to replace placeholders
    const processText = (text: string) => {
      if (!text) return text;

      // Replace company name placeholder if we have a company name
      if (companyName) {
        text = text.replace(/\[Your Company Name\]/g, companyName);
      }

      return text;
    };

    // Handle blocks format content
    if (content?.blocks && Array.isArray(content.blocks)) {
      return (
        <div className="space-y-6">
          {content.blocks.map((block: any, index: number) => {
            switch (block.type) {
              case "header":
                const level = block.data.level || 1;
                const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
                const headerSizes = {
                  1: "text-3xl font-bold mb-4 text-gray-900",
                  2: "text-2xl font-semibold mb-3 text-gray-800 mt-8",
                  3: "text-xl font-medium mb-2 text-gray-800 mt-6",
                  4: "text-lg font-medium mb-2 text-gray-700",
                };
                const headerClass =
                  headerSizes[level as keyof typeof headerSizes] ||
                  headerSizes[1];

                return (
                  <HeaderTag key={index} className={headerClass}>
                    {processText(block.data.text)}
                  </HeaderTag>
                );

              case "paragraph":
                return (
                  <p key={index} className="text-gray-700 leading-relaxed mb-4">
                    {processText(block.data.text)}
                  </p>
                );

              case "list":
                return (
                  <ul
                    key={index}
                    className="list-disc pl-6 mb-4 text-gray-700 space-y-2"
                  >
                    {block.data.items?.map(
                      (item: string, itemIndex: number) => (
                        <li key={itemIndex}>{processText(item)}</li>
                      )
                    )}
                  </ul>
                );

              case "image":
                return (
                  <div key={index} className="my-6">
                    <img
                      src={block.data.file?.url}
                      alt={block.data.caption || "Contract image"}
                      className="max-w-full h-auto rounded-lg"
                    />
                    {block.data.caption && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        {block.data.caption}
                      </p>
                    )}
                  </div>
                );

              default:
                // Handle other block types or unknown types
                return (
                  <div key={index} className="mb-4">
                    {block.data.text
                      ? processText(block.data.text)
                      : JSON.stringify(block.data)}
                  </div>
                );
            }
          })}
        </div>
      );
    }

    // Fallback for JSON data
    return (
      <pre className="p-4 bg-gray-100 rounded-lg overflow-x-auto">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    try {
      if (!contract) {
        toast.error("No contract data found");
        return;
      }
      const contractId = contract.id || id;
      // Display loading toast
      const loadingToast = toast.loading("Generating PDF...");

      // Get contract content
      const savedContent = contract.content
        ? JSON.stringify(contract.content)
        : null;
      if (!savedContent) {
        toast.dismiss(loadingToast);
        toast.error("No contract content found");
        return;
      }

      // Get designer and client signature data
      let designerSignatureImg = designerSignature?.signature || "";
      let designerName = designerSignature?.name || "Designer";
      let designerDate = designerSignature?.signedAt
        ? new Date(designerSignature.signedAt).toLocaleDateString()
        : new Date().toLocaleDateString();
      let clientSignatureImg = clientSignature?.signature || "";
      let clientName = clientSignature?.name || "Client";
      let clientDate = clientSignature?.signedAt
        ? new Date(clientSignature.signedAt).toLocaleDateString()
        : new Date().toLocaleDateString();

      let parsedContent: { blocks: any[] };
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

      parsedContent.blocks.forEach((block: any) => {
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
          (block.data.items as string[]).forEach((item: string) => {
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
        pdf.addPage();
        yPosition = 20;
      } else {
        yPosition += 30;
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Signatures", margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");

      // Designer signature section
      pdf.text(`Designer: ${designerName}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Date: ${designerDate}`, margin, yPosition);
      yPosition += 15;
      if (designerSignatureImg) {
        try {
          pdf.addImage(designerSignatureImg, "PNG", margin, yPosition, 80, 30);
          yPosition += 40;
        } catch (error) {
          pdf.text("(Signature)", margin, yPosition);
          yPosition += 15;
        }
      } else {
        pdf.text("(Signature not available)", margin, yPosition);
        yPosition += 15;
      }
      yPosition += 10;
      // Client signature section
      pdf.text(`Client: ${clientName || "Not signed yet"}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Date: ${clientDate || "Not signed yet"}`, margin, yPosition);
      yPosition += 15;
      if (clientSignatureImg) {
        try {
          pdf.addImage(clientSignatureImg, "PNG", margin, yPosition, 80, 30);
        } catch (error) {
          pdf.text("(Signature)", margin, yPosition);
        }
      } else {
        pdf.text("(Signature not available)", margin, yPosition);
      }
      pdf.save(`contract-${contractId}.pdf`);
      toast.dismiss(loadingToast);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Banner */}
      <div
        className="w-full h-40 bg-gradient-to-r from-blue-100 to-indigo-100"
        style={{
          backgroundImage: `url(${profileBannerUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Profile Image */}
            <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200">
              <img
                src={profileImageUrl}
                alt="Profile"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/placeholder-profile.png";
                }}
              />
            </div>

            <h1 className="text-xl font-bold text-gray-900 truncate">
              {contract.title || "Contract"}
            </h1>
          </div>

          {/* Contract Status */}
          <div className="flex items-center space-x-2">
            {designerSignature && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckIcon className="w-3 h-3 mr-1" />
                Prepared
              </span>
            )}

            {clientSignature && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <CheckIcon className="w-3 h-3 mr-1" />
                Signed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Contract Logo if available */}
          {logoUrl !== "/placeholder-logo.png" && (
            <div className="flex justify-start mb-8">
              <div className="h-24 w-24 overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Contract Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          {/* Contract Banner if available */}
          {bannerUrl !== "/placeholder-banner.png" && (
            <div className="mb-8">
              <img
                src={bannerUrl}
                alt="Contract Banner"
                className="w-full h-40 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          {/* Contract Content with Improved Typography */}
          <div className="prose prose-lg max-w-none mb-16">
            {renderContractContent(contract.content)}
          </div>

          {/* Signature Section */}
          <div className="border-t pt-10 mt-10">
            <h2 className="text-2xl font-semibold mb-8 text-gray-900">
              Signatures
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Designer Signature */}
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="flex items-center mb-4">
                  <div className="h-8 w-8 rounded-full overflow-hidden mr-3">
                    <img
                      src={profileImageUrl}
                      alt="Designer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/placeholder-profile.png";
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Prepared by
                  </h3>
                </div>

                {designerSignature ? (
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <img
                        src={designerSignature.signature}
                        alt="Designer Signature"
                        className="h-24 mx-auto object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{designerSignature.name}</p>
                      {designerSignature.signedAt && (
                        <p className="text-sm text-gray-500">
                          Signed on{" "}
                          {designerSignature.signedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <p>Awaiting signature</p>
                  </div>
                )}
              </div>

              {/* Client Signature */}
              <div className="border rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-medium mb-4 text-gray-800">
                  Client
                </h3>

                {clientSignature ? (
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <img
                        src={clientSignature.signature}
                        alt="Client Signature"
                        className="h-24 mx-auto object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{clientSignature.name}</p>
                      {clientSignature.signedAt && (
                        <p className="text-sm text-gray-500">
                          Signed on{" "}
                          {clientSignature.signedAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                    <p>Awaiting signature</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {clientSignature && (
            <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg shadow hover:bg-gray-800 transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download as PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Sign Button - follows scroll */}
      {!clientSignature && (
        <div
          className={`fixed bottom-6 right-6 transition-opacity duration-300 ${
            isScrolled ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button
            onClick={handleSignContract}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Sign Contract
          </button>
        </div>
      )}

      {/* Sign Now Button - when at the bottom */}
      {!clientSignature && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={handleSignContract}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center"
          >
            <PencilIcon className="h-5 w-5 mr-2" />
            Sign Document
          </button>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Sign Contract</h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter your full name"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Signature
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <SignaturePad
                  ref={signaturePadRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: "signature-canvas w-full",
                  }}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => signaturePadRef.current?.clear()}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Clear
              </button>
              <button
                onClick={handleSignatureComplete}
                disabled={isSigning || !signerName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigning ? "Signing..." : "Complete Signing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
