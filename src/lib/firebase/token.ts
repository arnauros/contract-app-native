import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  Firestore,
  getFirestore,
} from "firebase/firestore";
import { db as firebaseDb, initFirebase } from "./firebase";
import { Contract, ViewTracking } from "./types";
import { toast } from "react-hot-toast";

// Ensure db is not null
let firestore: Firestore;
if (firebaseDb) {
  firestore = firebaseDb;
} else {
  const { app } = initFirebase();
  firestore = getFirestore(app);
}

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

  // For tracking purposes, we still check if the token is valid,
  // but we'll consider all contracts valid for access purposes

  // Check view token
  if (contract.viewToken?.value === token) {
    const isExpired = new Date(contract.viewToken.expiresAt) < now;
    // We log but don't throw if expired
    if (isExpired) {
      console.log(
        "View token is expired, but continuing as contracts are public"
      );
    }
    return { isValid: !isExpired, isPreview: false, contract };
  }

  // Check preview token
  if (contract.previewToken?.value === token) {
    const isExpired = new Date(contract.previewToken.expiresAt) < now;
    // We log but don't throw if expired
    if (isExpired) {
      console.log(
        "Preview token is expired, but continuing as contracts are public"
      );
    }
    return { isValid: !isExpired, isPreview: true, contract };
  }

  // If token doesn't match, we still return the contract but mark as invalid
  // This is a change from the previous behavior where we would throw an error
  console.log(
    "Token doesn't match any known tokens, but continuing as contracts are public"
  );
  return { isValid: false, isPreview: false, contract };
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
      // No longer blocking access, just informational
      toast(
        "The access token has expired, but you still have access to the contract."
      );
      break;
    case ContractAccessError.TOKEN_INVALID:
      // No longer blocking access, just informational
      toast(
        "The access token is invalid, but you still have access to the contract."
      );
      break;
    case ContractAccessError.RATE_LIMIT_EXCEEDED:
      // This should rarely be shown since we're not enforcing rate limits
      toast("High traffic detected. Performance may be affected.");
      break;
    case ContractAccessError.CONTRACT_NOT_FOUND:
      // This is still a valid error - the contract must exist
      toast.error("Contract not found. Please check the URL and try again.");
      break;
    default:
      toast.error("An unexpected error occurred. Please try again later.");
  }
};
