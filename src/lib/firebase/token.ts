import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Firestore,
} from "firebase/firestore";
import { db } from "./config";
import { Contract, ViewTracking } from "./types";
import { toast } from "react-hot-toast";

// Ensure db is not null
const firestore = db as Firestore;

export const ContractAccessError = {
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  CONTRACT_NOT_FOUND: "CONTRACT_NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
} as const;

export type ContractAccessErrorType =
  (typeof ContractAccessError)[keyof typeof ContractAccessError];

export const validateContractToken = async (
  contractId: string,
  token: string
): Promise<{
  isValid: boolean;
  isPreview: boolean;
  contract: Contract;
}> => {
  const contractRef = doc(firestore, "contracts", contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    throw ContractAccessError.CONTRACT_NOT_FOUND;
  }

  const contract = contractSnap.data() as Contract;
  const now = new Date();

  // Check view token
  if (contract.viewToken?.value === token) {
    if (new Date(contract.viewToken.expiresAt) < now) {
      throw ContractAccessError.TOKEN_EXPIRED;
    }
    return { isValid: true, isPreview: false, contract };
  }

  // Check preview token
  if (contract.previewToken?.value === token) {
    if (new Date(contract.previewToken.expiresAt) < now) {
      throw ContractAccessError.TOKEN_EXPIRED;
    }
    return { isValid: true, isPreview: true, contract };
  }

  throw ContractAccessError.TOKEN_INVALID;
};

export const trackView = async (
  contractId: string,
  token: string,
  isPreview: boolean
) => {
  const viewRef = doc(firestore, "contracts", contractId, "views", token);
  const viewSnap = await getDoc(viewRef);

  const clientIP = await fetch("https://api.ipify.org?format=json")
    .then((res) => res.json())
    .then((data) => data.ip)
    .catch(() => "unknown");

  if (viewSnap.exists()) {
    const view = viewSnap.data() as ViewTracking;
    if (view.viewCount > 10) {
      throw ContractAccessError.RATE_LIMIT_EXCEEDED;
    }
  }

  const viewData: ViewTracking = {
    contractId,
    viewedAt: new Date().toISOString(),
    ipAddress: clientIP,
    userAgent: navigator.userAgent,
    token,
    viewCount: 1,
    tokenType: isPreview ? "preview" : "view",
  };

  await setDoc(viewRef, viewData, { merge: true });

  // Update contract metadata
  await updateDoc(doc(firestore, "contracts", contractId), {
    lastViewedAt: new Date().toISOString(),
    "metadata.viewCount": increment(1),
    "metadata.lastViewedFrom": clientIP,
    "metadata.lastActivity": new Date().toISOString(),
    "metadata.userAgent": navigator.userAgent,
  });
};

export const rotateViewToken = async (contractId: string): Promise<string> => {
  const newToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

  await updateDoc(doc(firestore, "contracts", contractId), {
    viewToken: {
      value: newToken,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return newToken;
};

export const generatePreviewToken = async (
  contractId: string,
  expirationDays = 7
): Promise<string> => {
  const newToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  await updateDoc(doc(firestore, "contracts", contractId), {
    previewToken: {
      value: newToken,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return newToken;
};

export const handleAccessError = (error: ContractAccessErrorType) => {
  switch (error) {
    case ContractAccessError.TOKEN_EXPIRED:
      toast.error("This link has expired. Please request a new one.");
      break;
    case ContractAccessError.TOKEN_INVALID:
      toast.error("Invalid access token.");
      break;
    case ContractAccessError.RATE_LIMIT_EXCEEDED:
      toast.error("Too many views. Please try again later.");
      break;
    case ContractAccessError.CONTRACT_NOT_FOUND:
      toast.error("Contract not found.");
      break;
    default:
      toast.error("Access denied. Please contact support.");
  }
};
