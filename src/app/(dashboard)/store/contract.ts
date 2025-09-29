import { create } from "zustand";
import { ContractData, FileWithSummary } from "../../types/contract";

interface ContractStore {
  contractData: ContractData;
  setField: (field: keyof ContractData, value: any) => void;
  addAttachment: (attachment: FileWithSummary) => void;
  removeAttachment: (index: number) => void;
  updateFromSummaries: () => void;
}

export const useContractStore = create<ContractStore>((set, get) => ({
  contractData: {
    projectBrief: "",
    techStack: "The tech stack includes ",
    startDate: "",
    endDate: "",
    clientName: "",
    clientEmail: "",
    attachments: [],
  },

  setField: (field, value) =>
    set((state) => ({
      contractData: { ...state.contractData, [field]: value },
    })),

  addAttachment: (attachment) => {
    set((state) => {
      const newData = { ...state.contractData };
      newData.attachments = [...newData.attachments, attachment];
      return { contractData: newData };
    });
    get().updateFromSummaries();
  },

  removeAttachment: (index) =>
    set((state) => ({
      contractData: {
        ...state.contractData,
        attachments: state.contractData.attachments.filter(
          (_, i) => i !== index
        ),
      },
    })),

  updateFromSummaries: () => {
    const { contractData } = get();
    const newData = { ...contractData };

    contractData.attachments.forEach((attachment) => {
      if (!attachment.type || !attachment.summary) return;

      switch (attachment.type) {
        case "brief":
          if (!newData.projectBrief) {
            newData.projectBrief = attachment.summary;
          }
          break;
        case "techStack":
          if (
            !newData.techStack ||
            newData.techStack === "The tech stack includes "
          ) {
            newData.techStack = attachment.summary;
          }
          break;
        case "timeline":
          // Extract dates if they exist in the summary
          const dates = extractDatesFromSummary(attachment.summary);
          if (dates.start && !newData.startDate)
            newData.startDate = dates.start;
          if (dates.end && !newData.endDate) newData.endDate = dates.end;
          break;
      }
    });

    set({ contractData: newData });
  },
}));

function extractDatesFromSummary(summary: string) {
  const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
  const dates = summary.match(dateRegex) || [];
  return {
    start: dates[0],
    end: dates[1],
  };
}
