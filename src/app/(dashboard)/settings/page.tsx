"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useTutorial } from "@/lib/hooks/useTutorial";
import {
  initializeTutorialForUser,
  startTutorial,
  dismissTutorial,
  resetTutorialForUser,
} from "@/lib/tutorial/tutorialUtils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { updateUserProfile, signOut } from "@/lib/firebase/authUtils";
import {
  FiUser,
  FiCreditCard,
  FiSettings,
  FiLogOut,
  FiTrash,
  FiCode,
  FiImage,
  FiMail,
  FiLink,
  FiFileText,
  FiDollarSign,
} from "react-icons/fi";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import DebugClaims from "@/app/Components/DebugClaims";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUser } from "firebase/auth";
import {
  doc,
  setDoc,
  getFirestore,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import ProfileImageUploader from "@/app/Components/ProfileImageUploader";

// Mock customer creation removed - using real Stripe integration

export default function SettingsPage() {
  const { user, loading, isAdmin } = useAuth();
  const { trackAction } = useTutorial();
  const [isTutorialTesting, setIsTutorialTesting] = useState(false);
  const router = useRouter();
  const {
    isActive: isSubscriptionActive,
    loading: subscriptionLoading,
    openCustomerPortal,
    createCheckoutSession,
  } = useSubscription();

  const [activeTab, setActiveTab] = useState("account");
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Email template state
  const [emailTemplates, setEmailTemplates] = useState({
    contractInvite: {
      subject: "Contract Ready for Signature: {{contractTitle}}",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract for Review</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #2563eb; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Contract Ready for Review</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 20px;">
              <h2 style="margin-top: 0;">Hello {{recipientName}},</h2>
              <p style="margin-bottom: 20px; line-height: 1.5;">A contract has been shared with you for review and signature. Please click the button below to view and sign the document.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{contractUrl}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View and Sign Contract
                </a>
              </div>
              
              <p style="line-height: 1.5;">If the button above doesn't work, copy and paste this URL into your browser:</p>
              <p style="margin-bottom: 20px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
                {{contractUrl}}
              </p>
              
              <p style="line-height: 1.5; margin-bottom: 0;">This link will expire in 7 days. If you have any questions, please contact the sender directly.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 14px; color: #666666;">This email was sent via Macu Studio Contract System</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    designerSigned: {
      subject: "Designer Signed: {{contractTitle}}",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Designer Signed Contract</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #059669; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Designer Signed Contract</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 20px;">
              <h2 style="margin-top: 0;">Hello {{recipientName}},</h2>
              <p style="margin-bottom: 20px; line-height: 1.5;">Great news! {{signerName}} has signed the contract "{{contractTitle}}". The contract is now ready for your signature.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{contractUrl}}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Contract
                </a>
              </div>
              
              <p style="line-height: 1.5; margin-bottom: 0;">Please review and sign the contract to complete the process.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    clientSigned: {
      subject: "Client Signed: {{contractTitle}}",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Signed Contract</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #059669; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Client Signed Contract</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 20px;">
              <h2 style="margin-top: 0;">Hello {{recipientName}},</h2>
              <p style="margin-bottom: 20px; line-height: 1.5;">Excellent! {{signerName}} has signed the contract "{{contractTitle}}". Your contract is now fully executed.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{contractUrl}}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Contract
                </a>
              </div>
              
              <p style="line-height: 1.5; margin-bottom: 0;">The contract is now complete and legally binding.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    contractComplete: {
      subject: "Contract Complete: {{contractTitle}}",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contract Fully Executed</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background-color: #7C3AED; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Contract Fully Executed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 20px;">
              <h2 style="margin-top: 0;">Hello {{recipientName}},</h2>
              <p style="margin-bottom: 20px; line-height: 1.5;">🎉 Congratulations! The contract "{{contractTitle}}" has been fully executed with all signatures complete.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{contractUrl}}" style="display: inline-block; background-color: #7C3AED; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  View Completed Contract
                </a>
              </div>
              
              <p style="line-height: 1.5; margin-bottom: 0;">The contract is now legally binding and complete.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
  });
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] =
    useState<string>("contractInvite");

  // Image state
  const [profileImageUrl, setProfileImageUrl] = useState<string>(
    "/placeholders/profile.png"
  );
  const [profileBannerUrl, setProfileBannerUrl] = useState<string>(
    "/placeholders/banner.png"
  );

  // Contract & Invoice Settings state
  const [contractSettings, setContractSettings] = useState({
    companyName: "",
    companyAddress: "",
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    iban: "",
    bankName: "",
    bicSwift: "",
    taxId: "",
    paymentTerms: "net30",
    currency: "USD",
  });

  // Initialize form state from user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");

      // Try loading from localStorage first for immediate display
      const tryLocalImages = () => {
        const userId = user.uid;
        const profileImageKey = `profileImage-${userId}`;
        const profileBannerKey = `profileBanner-${userId}`;

        const savedProfileImage = localStorage.getItem(profileImageKey);
        const savedProfileBanner = localStorage.getItem(profileBannerKey);

        if (savedProfileImage) {
          setProfileImageUrl(savedProfileImage);
        } else if (user.photoURL) {
          // If no localStorage but Auth profile pic exists
          setProfileImageUrl(user.photoURL);
          // Save to localStorage
          localStorage.setItem(profileImageKey, user.photoURL);
        }

        if (savedProfileBanner) {
          setProfileBannerUrl(savedProfileBanner);
        }
      };

      // Try localStorage first
      tryLocalImages();

      // Then get the latest data from Firestore
      const fetchUserData = async () => {
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Set profile image and banner if available
            if (userData.profileImageUrl) {
              setProfileImageUrl(userData.profileImageUrl);
              localStorage.setItem(
                `profileImage-${user.uid}`,
                userData.profileImageUrl
              );
            }

            if (userData.profileBannerUrl) {
              setProfileBannerUrl(userData.profileBannerUrl);
              localStorage.setItem(
                `profileBanner-${user.uid}`,
                userData.profileBannerUrl
              );
            }

            // Load email templates if available
            if (userData.emailTemplates) {
              setEmailTemplates(userData.emailTemplates);
            }

            // Load contract & invoice settings if available
            if (userData.contractSettings) {
              setContractSettings(userData.contractSettings);
            }
            if (userData.invoiceSettings) {
              setInvoiceSettings(userData.invoiceSettings);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };

      fetchUserData();
    }
  }, [user]);

  // Ensure profile image and banner are loaded from localStorage if available
  useEffect(() => {
    if (user) {
      const userId = user.uid;
      const profileImageKey = `profileImage-${userId}`;
      const profileBannerKey = `profileBanner-${userId}`;

      const savedProfileImage = localStorage.getItem(profileImageKey);
      const savedProfileBanner = localStorage.getItem(profileBannerKey);

      if (savedProfileImage) {
        setProfileImageUrl(savedProfileImage);
      }

      if (savedProfileBanner) {
        setProfileBannerUrl(savedProfileBanner);
      }
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      const result = await updateUserProfile(displayName, profileImageUrl);
      if (result.error) {
        toast.error(
          result.error instanceof Error
            ? result.error.message
            : "Failed to update profile"
        );
        return;
      }
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid), {
        contractSettings,
        invoiceSettings,
      });
      toast.success("Contract & Invoice settings saved successfully!");
    } catch (error) {
      console.error("Error saving contract & invoice settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Function to upgrade to yearly subscription
  const handleYearlyUpgrade = useCallback(async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to upgrade");
        return;
      }

      const loadingToast = toast.loading("Preparing yearly subscription...");

      try {
        await createCheckoutSession("price_1ROwocEAkEk7AeWQVxTQJAJ7");
        // If successful, the user will be redirected
      } catch (error) {
        console.error("Error upgrading to yearly:", error);
        toast.error("Failed to upgrade subscription");
      } finally {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }
      }
    } catch (error) {
      console.error("Error in handleYearlyUpgrade:", error);
      toast.error("An unexpected error occurred");
    }
  }, [user, createCheckoutSession]);

  // Function to manage subscription
  const handleManageSubscription = useCallback(async () => {
    try {
      if (!user) {
        toast.error("You must be logged in to manage your subscription");
        return;
      }

      // The useSubscription hook handles its own toasts, so we don't need to add more
      await openCustomerPortal();
    } catch (error) {
      console.error("Error in handleManageSubscription:", error);
      // Error handling is done by the useSubscription hook
    }
  }, [user, openCustomerPortal]);

  // Function to delete account
  const handleDeleteAccount = useCallback(async () => {
    if (!user) {
      toast.error("No user account to delete");
      return;
    }

    if (deleteConfirmText !== user.email) {
      toast.error("Email confirmation doesn't match");
      return;
    }

    try {
      setDeletingAccount(true);

      // First, check if user has active subscription and warn them
      let shouldBlockDeletion = isSubscriptionActive;

      if (isSubscriptionActive) {
        try {
          // Cancel subscription first by opening portal
          const loadingToast = toast.loading("Checking subscription status...");
          try {
            await openCustomerPortal();
            // If successful, the user will be redirected to the portal
          } catch (error) {
            console.error("Error opening customer portal:", error);

            // Check for specific error messages
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            // Only show a warning if it's an actual error, not just missing customer data
            if (
              !errorMessage.includes("No Stripe customer found") &&
              !errorMessage.includes("User not found") &&
              !errorMessage.includes("Database error")
            ) {
              toast.error(
                "Failed to open subscription portal, but you can still delete your account"
              );
            }

            // Since there was an error with the subscription check,
            // we'll assume there's no active subscription to block deletion
            // This is a safer approach than blocking deletion because of API errors
            shouldBlockDeletion = false;
          } finally {
            if (loadingToast) {
              toast.dismiss(loadingToast);
            }
          }

          // We still warn them about active subscription if we know they have one
          if (shouldBlockDeletion) {
            toast.error(
              "Please cancel your subscription first before deleting your account"
            );
            setDeletingAccount(false);
            setDeleteDialogOpen(false);
            return;
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }

      // Delete user account
      await deleteUser(user);

      // Clear any session data
      await fetch("/api/auth/session", {
        method: "DELETE",
      });

      toast.success("Your account has been deleted");
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        "Failed to delete account. Try signing in again before deleting."
      );
      setDeletingAccount(false);
    }
  }, [
    user,
    deleteConfirmText,
    isSubscriptionActive,
    openCustomerPortal,
    router,
  ]);

  const handleProfileImageChange = (url: string) => {
    setProfileImageUrl(url);
    // Also save in localStorage for persistence
    if (user) {
      localStorage.setItem(`profileImage-${user.uid}`, url);
    }
  };

  const handleProfileBannerChange = (url: string) => {
    setProfileBannerUrl(url);
    // Also save in localStorage for persistence
    if (user) {
      localStorage.setItem(`profileBanner-${user.uid}`, url);
    }
  };

  const handleSaveEmailTemplates = async () => {
    if (!user) return;

    setSavingTemplates(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, "users", user.uid), {
        emailTemplates,
      });
      toast.success("Email templates saved successfully!");
    } catch (error) {
      console.error("Error saving email templates:", error);
      toast.error("Failed to save email templates");
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleTemplateChange = (
    templateType: string,
    field: string,
    value: string
  ) => {
    setEmailTemplates((prev) => ({
      ...prev,
      [templateType]: {
        ...prev[templateType as keyof typeof prev],
        [field]: value,
      },
    }));

    // Auto-update preview if this is the selected template
    if (templateType === selectedTemplateType) {
      const updatedTemplate = {
        ...emailTemplates[templateType as keyof typeof emailTemplates],
        [field]: value,
      };
      const previewHtml = generatePreviewHtmlFromTemplate(updatedTemplate);
      setPreviewTemplate(previewHtml);
    }
  };

  const generatePreviewHtmlFromTemplate = (template: any) => {
    if (!template) return "";

    // Replace variables with sample data for preview
    let previewHtml = template.html;
    previewHtml = previewHtml.replace(/\{\{recipientName\}\}/g, "John Client");
    previewHtml = previewHtml.replace(/\{\{signerName\}\}/g, "Jane Designer");
    previewHtml = previewHtml.replace(
      /\{\{contractTitle\}\}/g,
      "Website Design Contract"
    );
    previewHtml = previewHtml.replace(
      /\{\{contractUrl\}\}/g,
      "https://example.com/contract-view/abc123"
    );
    previewHtml = previewHtml.replace(/\{\{contractId\}\}/g, "abc123");

    return previewHtml;
  };

  const handlePreviewTemplate = (templateType: string) => {
    const template =
      emailTemplates[templateType as keyof typeof emailTemplates];
    if (template) {
      setSelectedTemplateType(templateType);
      const previewHtml = generatePreviewHtmlFromTemplate(template);
      setPreviewTemplate(previewHtml);
    }
  };

  // Auto-load preview when email templates tab is opened
  useEffect(() => {
    if (activeTab === "email-templates" && !previewTemplate) {
      const template =
        emailTemplates[selectedTemplateType as keyof typeof emailTemplates];
      if (template) {
        const previewHtml = generatePreviewHtmlFromTemplate(template);
        setPreviewTemplate(previewHtml);
      }
    }
  }, [activeTab, emailTemplates, selectedTemplateType, previewTemplate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p>Please login to view settings.</p>
      </div>
    );
  }

  // Track settings view
  useEffect(() => {
    trackAction("settings_viewed");
  }, [trackAction]);

  // Tutorial testing functions
  const handleResetTutorial = async () => {
    if (!user) return;

    try {
      console.log("🔄 Tutorial: Starting reset for user:", user.uid);
      setIsTutorialTesting(true);
      // Use the new reset function that properly resets the tutorial
      await resetTutorialForUser(user.uid);
      console.log("🔄 Tutorial: Reset completed, now starting tutorial");
      // Immediately start the tutorial after reset
      await startTutorial(user.uid);
      console.log("🔄 Tutorial: Tutorial started successfully");
      toast.success("Tutorial reset and started! Go to dashboard to see it.");
    } catch (error) {
      console.error("Failed to reset tutorial:", error);
      toast.error("Failed to reset tutorial");
    } finally {
      setIsTutorialTesting(false);
    }
  };

  const handleStartTutorial = async () => {
    if (!user) return;

    try {
      setIsTutorialTesting(true);
      await startTutorial(user.uid);
      toast.success("Tutorial started! Go to dashboard to see it.");
    } catch (error) {
      console.error("Failed to start tutorial:", error);
      toast.error("Failed to start tutorial");
    } finally {
      setIsTutorialTesting(false);
    }
  };

  const handleDismissTutorial = async () => {
    if (!user) return;

    try {
      setIsTutorialTesting(true);
      await dismissTutorial(user.uid);
      toast.success("Tutorial dismissed!");
    } catch (error) {
      console.error("Failed to dismiss tutorial:", error);
      toast.error("Failed to dismiss tutorial");
    } finally {
      setIsTutorialTesting(false);
    }
  };

  const tabs = [
    { id: "account", label: "Account", icon: FiUser },
    { id: "subscription", label: "Subscription", icon: FiCreditCard },
    // { id: "email-templates", label: "Email Templates", icon: FiMail },
    { id: "contract-invoices", label: "Contract & Invoices", icon: FiFileText },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${
          activeTab === "subscription" ? "md:grid-cols-3" : ""
        } gap-8`}
      >
        <div className={activeTab === "subscription" ? "md:col-span-2" : ""}>
          {/* Account Tab Content */}
          {activeTab === "account" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-8">
                {/* Profile Banner */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="h-40 w-full relative">
                    <ProfileImageUploader
                      type="profileBanner"
                      imageUrl={profileBannerUrl}
                      onImageChange={handleProfileBannerChange}
                      className="w-full"
                    />
                  </div>

                  {/* Profile Image (overlapping with banner) */}
                  <div className="px-6 pb-6 pt-12 relative">
                    <div className="absolute -top-20 left-6">
                      <ProfileImageUploader
                        type="profileImage"
                        imageUrl={profileImageUrl}
                        onImageChange={handleProfileImageChange}
                        className="w-full shadow-md border-4 border-white"
                      />
                    </div>
                    <div className="ml-32">
                      <h2 className="text-xl font-semibold">
                        {user?.displayName}
                      </h2>
                      <p className="text-gray-600">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Settings */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-6">
                    Profile Settings
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-gray-700 text-sm font-medium mb-2"
                        htmlFor="name"
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-gray-700 text-sm font-medium mb-2"
                        htmlFor="email"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        disabled
                        value={user?.email || ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={async () => {
                        setSaving(true);
                        try {
                          // Update Firebase Auth profile
                          const result = await updateUserProfile(
                            displayName,
                            profileImageUrl
                          );
                          if (result.error) throw result.error;
                          // Update Firestore user doc
                          const db = getFirestore();
                          await updateDoc(doc(db, "users", user.uid), {
                            displayName,
                            profileImageUrl,
                            profileBannerUrl,
                          });
                          toast.success("Profile updated successfully!");
                        } catch (error) {
                          toast.error("Failed to update profile");
                          console.error(error);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Add Debug Claims component - only visible in development */}
                {process.env.NODE_ENV === "development" && <DebugClaims />}
              </div>

              {/* Right Column */}
              <div className="space-y-8">
                {/* Account Security Section */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-6">
                    Account Security
                  </h2>

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Delete Account</h3>
                    <p className="text-gray-600 mb-4">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="flex items-center"
                    >
                      <FiTrash className="mr-2" />
                      Delete Account
                    </Button>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-medium mb-2">Sign Out</h3>
                    <p className="text-gray-600 mb-4">
                      Sign out of your account on this device.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      className="flex items-center"
                    >
                      <FiLogOut className="mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>

                {/* Tutorial Testing Section - only visible in development */}
                {process.env.NODE_ENV === "development" && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-6 flex items-center">
                      <FiSettings className="mr-2" />
                      Tutorial Testing
                    </h2>

                    <div className="space-y-4">
                      <p className="text-gray-600 text-sm">
                        Test the tutorial system by pretending to be a
                        first-time user.
                      </p>

                      <div className="space-y-3">
                        <button
                          onClick={handleResetTutorial}
                          disabled={isTutorialTesting}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isTutorialTesting
                            ? "Loading..."
                            : "🔄 Reset Tutorial"}
                        </button>

                        <button
                          onClick={handleStartTutorial}
                          disabled={isTutorialTesting}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isTutorialTesting
                            ? "Loading..."
                            : "▶️ Start Tutorial"}
                        </button>

                        <button
                          onClick={handleDismissTutorial}
                          disabled={isTutorialTesting}
                          className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isTutorialTesting
                            ? "Loading..."
                            : "❌ Dismiss Tutorial"}
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 mt-3">
                        <p>
                          • <strong>Reset:</strong> Creates fresh tutorial state
                        </p>
                        <p>
                          • <strong>Start:</strong> Activates tutorial for
                          current user
                        </p>
                        <p>
                          • <strong>Dismiss:</strong> Hides tutorial
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Templates Tab Content */}
          {activeTab === "email-templates" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Email Templates Editor */}
              <div>
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <FiMail className="mr-2" />
                    Email Templates
                  </h2>

                  <div className="space-y-6">
                    {Object.entries(emailTemplates).map(
                      ([templateType, template]) => (
                        <div
                          key={templateType}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3
                              className={`text-lg font-medium capitalize ${
                                selectedTemplateType === templateType
                                  ? "text-blue-600"
                                  : "text-gray-900"
                              }`}
                            >
                              {templateType.replace(/([A-Z])/g, " $1").trim()}
                            </h3>
                            <button
                              onClick={() =>
                                handlePreviewTemplate(templateType)
                              }
                              className={`text-sm px-3 py-1 rounded-md transition ${
                                selectedTemplateType === templateType
                                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                              }`}
                            >
                              {selectedTemplateType === templateType
                                ? "Active"
                                : "Preview"}
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subject Line
                              </label>
                              <input
                                type="text"
                                value={template.subject}
                                onChange={(e) =>
                                  handleTemplateChange(
                                    templateType,
                                    "subject",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Email subject with variables like {{contractTitle}}"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                HTML Content
                              </label>
                              <textarea
                                value={template.html}
                                onChange={(e) =>
                                  handleTemplateChange(
                                    templateType,
                                    "html",
                                    e.target.value
                                  )
                                }
                                rows={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                placeholder="HTML email template with variables like {{recipientName}}, {{contractTitle}}, {{contractUrl}}"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleSaveEmailTemplates}
                      disabled={savingTemplates}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {savingTemplates ? "Saving..." : "Save Email Templates"}
                    </button>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                      Available Variables:
                    </h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>
                        <code>{`{{ recipientName }}`}</code> - Name of the email
                        recipient
                      </div>
                      <div>
                        <code>{`{{ signerName }}`}</code> - Name of the person
                        who signed
                      </div>
                      <div>
                        <code>{`{{ contractTitle }}`}</code> - Title of the
                        contract
                      </div>
                      <div>
                        <code>{`{{ contractUrl }}`}</code> - Link to view the
                        contract
                      </div>
                      <div>
                        <code>{`{{ contractId }}`}</code> - Unique contract
                        identifier
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Email Preview */}
              <div>
                <div className="bg-white p-6 rounded-lg shadow mb-8 sticky top-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center">
                      <FiMail className="mr-2" />
                      Email Preview
                    </h2>
                    <div className="text-sm text-gray-500">
                      {selectedTemplateType.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>

                  {previewTemplate ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Email client mockup header */}
                      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-sm text-gray-600 font-medium">
                            Email Preview
                          </p>
                        </div>
                        <div className="w-12"></div>
                      </div>

                      {/* Email content */}
                      <div className="bg-white">
                        <div
                          className="max-h-[500px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: previewTemplate }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <FiMail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">Loading preview...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab Content */}
          {activeTab === "subscription" && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-6">
                Subscription Management
              </h2>
              <div className="flex items-center mb-4">
                <div
                  className={`h-3 w-3 rounded-full mr-2 ${
                    isSubscriptionActive ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
                <span className="font-medium">
                  {isSubscriptionActive
                    ? "Active subscription"
                    : "No active subscription"}
                </span>
              </div>

              <p className="text-gray-600 mb-6">
                {isSubscriptionActive
                  ? "You currently have an active subscription. You can manage your billing information and subscription plan through the customer portal."
                  : "Upgrade to a yearly subscription to access premium features and save on your subscription."}
              </p>

              <div className="flex space-x-4">
                {isSubscriptionActive ? (
                  <Button
                    onClick={handleManageSubscription}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Manage Subscription
                  </Button>
                ) : (
                  <Button
                    onClick={handleYearlyUpgrade}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Upgrade to Yearly
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Contract & Invoices Tab Content */}
          {activeTab === "contract-invoices" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contract Settings */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <FiFileText className="mr-2" />
                    Contract Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={contractSettings.companyName}
                        onChange={(e) =>
                          setContractSettings({
                            ...contractSettings,
                            companyName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your Company Name"
                      />
                    </div>

                    {/* Company Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Address
                      </label>
                      <textarea
                        rows={3}
                        value={contractSettings.companyAddress}
                        onChange={(e) =>
                          setContractSettings({
                            ...contractSettings,
                            companyAddress: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>
                  </div>
                </div>

                {/* Invoice Settings */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <FiDollarSign className="mr-2" />
                    Invoice Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Default IBAN */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default IBAN
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.iban}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            iban: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="GB82 WEST 1234 5698 7654 32"
                      />
                    </div>

                    {/* Bank Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.bankName}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            bankName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your Bank Name"
                      />
                    </div>

                    {/* BIC/SWIFT Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        BIC/SWIFT Code
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.bicSwift}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            bicSwift: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="DEUTDEFF"
                      />
                    </div>

                    {/* Tax ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID / VAT Number
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.taxId}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            taxId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="DE123456789"
                      />
                    </div>

                    {/* Invoice Terms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Terms
                      </label>
                      <select
                        value={invoiceSettings.paymentTerms}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            paymentTerms: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="net30">Net 30 days</option>
                        <option value="net15">Net 15 days</option>
                        <option value="net7">Net 7 days</option>
                        <option value="due_on_receipt">Due on receipt</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Currency
                      </label>
                      <select
                        value={invoiceSettings.currency}
                        onChange={(e) =>
                          setInvoiceSettings({
                            ...invoiceSettings,
                            currency: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button - Full Width */}
              <div className="mt-8">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Contract & Invoice Settings"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar - Only show for Subscription tab */}
        {activeTab === "subscription" && (
          <div>
            <SubscriptionStatus />
          </div>
        )}
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All of your data
              will be permanently deleted.
            </DialogDescription>
            {isSubscriptionActive && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                You have an active subscription. Please cancel your subscription
                first before deleting your account.
              </div>
            )}
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm font-medium">
              To confirm, please enter your email address:
            </p>
            <Input
              className="mt-2"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={user?.email || "your-email@example.com"}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== user?.email}
            >
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
