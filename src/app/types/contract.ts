export interface ContractData {
  projectBrief: string;
  techStack: string;
  startDate: string;
  endDate: string;
  clientName: string;
  clientEmail: string;
  attachments: FileWithSummary[];
}

export interface FileWithSummary {
  file: File;
  summary: string;
  type?: "brief" | "timeline" | "techStack" | "paymentTerms";
  isLoading: boolean;
}

export interface ContractFormState {
  currentStage: number;
  data: ContractData;
  isValid: boolean;
}
