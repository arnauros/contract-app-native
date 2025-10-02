import { TutorialConfig } from "./types";

export const TUTORIAL_CONFIG: TutorialConfig = {
  autoStart: true,
  showProgress: true,
  position: "bottom-right",
  steps: [
    {
      id: "create_contract",
      title: "Create your first contract",
      description: "Generate a professional contract for your client.",
      action: "contract_created",
      icon: "📝",
      order: 1,
    },
    {
      id: "send_contract",
      title: "Send contract to client",
      description:
        "Share your contract with your client for review and signing.",
      action: "contract_sent",
      icon: "📤",
      order: 2,
    },
    {
      id: "create_invoice",
      title: "Generate your first invoice",
      description: "Create an invoice for your completed work.",
      action: "invoice_created",
      icon: "🧾",
      order: 3,
    },
    {
      id: "send_invoice",
      title: "Send invoice to client",
      description: "Share your invoice with your client for payment.",
      action: "invoice_sent",
      icon: "💸",
      order: 4,
    },
    {
      id: "customize_profile",
      title: "Customize your profile",
      description: "Set up your professional profile and branding.",
      action: "profile_updated",
      icon: "👤",
      order: 5,
    },
    {
      id: "setup_payments",
      title: "Set up payment information",
      description: "Configure your payment methods and billing settings.",
      action: "payment_setup",
      icon: "💳",
      order: 6,
    },
    {
      id: "explore_settings",
      title: "Explore settings",
      description: "Review and configure your account settings.",
      action: "settings_viewed",
      icon: "⚙️",
      order: 7,
    },
    {
      id: "complete",
      title: "You're All Set!",
      description:
        "You've completed the setup! You're ready to manage your freelance business.",
      icon: "🎉",
      order: 8,
    },
  ],
};
