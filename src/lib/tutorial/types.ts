export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string; // The action that completes this step
  icon?: string;
  completed: boolean;
  order: number;
}

export interface TutorialState {
  isActive: boolean;
  isCompleted: boolean;
  isDismissed?: boolean;
  steps: TutorialStep[];
  currentStep?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TutorialConfig {
  steps: Omit<TutorialStep, "completed">[];
  autoStart?: boolean;
  showProgress?: boolean;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}
