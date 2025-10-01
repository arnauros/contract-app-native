import { TutorialConfig } from "./types";

export const TUTORIAL_CONFIG: TutorialConfig = {
  autoStart: true,
  showProgress: true,
  position: "top-right",
  steps: [
    {
      id: "welcome",
      title: "Welcome",
      description:
        "You're all set up! Let's get you started with your first contract.",
      icon: "👋",
      order: 1,
    },
    {
      id: "create_contract",
      title: "Create Your First Contract",
      description: "Fill out the form below to create your first contract.",
      action: "contract_created",
      icon: "📝",
      order: 2,
    },
    {
      id: "view_contracts",
      title: "View Your Contracts",
      description: "Check out your contracts list to see all your work.",
      action: "contracts_viewed",
      icon: "📋",
      order: 3,
    },
    {
      id: "send_contract",
      title: "Send to Client",
      description: "Send your contract to your client for signing.",
      action: "contract_sent",
      icon: "📤",
      order: 4,
    },
    {
      id: "explore_settings",
      title: "Explore Settings",
      description: "Customize your profile and manage your subscription.",
      action: "settings_viewed",
      icon: "⚙️",
      order: 5,
    },
    {
      id: "complete",
      title: "You're All Set!",
      description:
        "You've completed the tutorial! You're ready to manage your freelance contracts.",
      icon: "✅",
      order: 6,
    },
  ],
};
