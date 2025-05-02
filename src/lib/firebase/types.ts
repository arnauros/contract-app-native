import { ContractAccessError } from "./token";

export interface Contract {
  id: string;
  userId?: string;
  title?: string;
  content?: any; // EditorJS data
  status?: "draft" | "pending" | "signed" | "expired" | "declined";
  createdAt?: any;
  updatedAt?: any;
  pdf?: string | null;
  clientEmail?: string;
  clientName?: string;
  sentAt?: string;
  lastViewedAt?: string;
  lastSignedAt?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  viewToken?: {
    value: string;
    expiresAt: string;
  };
  previewToken?: {
    value: string;
    expiresAt: string;
  };
  trackingId?: string;
  version: number;
  previousVersions?: {
    content: any;
    updatedAt: any;
    version: number;
  }[];
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    lastActivity?: string;
    viewCount?: number;
    lastViewedFrom?: string;
  };
  signatures?: {
    clientSignature?: string;
    clientName?: string;
    clientSignedAt?: Date;
    designerSignature?: string;
    designerName?: string;
    designerSignedAt?: Date;
  };
}

export interface ViewTracking {
  contractId: string;
  viewedAt: string;
  ipAddress: string;
  userAgent: string;
  token: string;
  viewCount: number;
  tokenType: "view" | "preview";
}

export interface ContractAudit {
  contractId: string;
  issues: Array<{
    type: "Enhancement" | "Protection" | "Clarity" | "Professional";
    text: string;
    suggestion?: string;
    section?: string;
    position: {
      blockIndex: number;
      start: number;
      end: number;
    };
  }>;
  summary: {
    total: number;
    enhancements: number;
    protections: number;
    clarities: number;
    professionals: number;
  };
  createdAt: Date;
}

export interface Signature {
  contractId: string;
  userId: string;
  signedAt: Date;
  signature: string; // Base64 signature image or data
  name: string; // Full name of the signer
}

export interface Comment {
  id: string;
  blockId: string;
  blockContent: string;
  comment: string;
  timestamp: number;
  isEditing?: boolean;
  isDismissed?: boolean;
  replies: Array<{
    id: string;
    comment: string;
    timestamp: number;
  }>;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export type ContractAccessErrorType =
  (typeof ContractAccessError)[keyof typeof ContractAccessError];
