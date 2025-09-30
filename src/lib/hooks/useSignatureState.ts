import { useState, useEffect, useCallback } from "react";
import {
  signatureManager,
  SignatureState,
  SignatureCheckResult,
} from "@/lib/signature/SignatureManager";

export interface UseSignatureStateOptions {
  contractId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseSignatureStateReturn {
  signatureState: SignatureState;
  canEdit: boolean;
  reason?: string;
  isLoading: boolean;
  refresh: () => Promise<void>;
  invalidateCache: () => void;
}

/**
 * Centralized hook for managing contract signature state
 * All components should use this instead of implementing their own logic
 */
export function useSignatureState({
  contractId,
  autoRefresh = true,
  refreshInterval = 10000,
}: UseSignatureStateOptions): UseSignatureStateReturn {
  const [signatureState, setSignatureState] = useState<SignatureState>({
    hasDesignerSignature: false,
    hasClientSignature: false,
    designerSignature: null,
    clientSignature: null,
    isLoading: true,
    lastChecked: 0,
  });

  const [canEdit, setCanEdit] = useState<boolean>(true);
  const [reason, setReason] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    if (!contractId) return;

    try {
      const result: SignatureCheckResult =
        await signatureManager.canEditContract(contractId);

      setSignatureState(result.signatureState);
      setCanEdit(result.canEdit);
      setReason(result.reason);
    } catch (error) {
      console.error("Error refreshing signature state:", error);
      // Keep existing state on error
    }
  }, [contractId]);

  const invalidateCache = useCallback(() => {
    signatureManager.invalidateCache(contractId);
    refresh();
  }, [contractId, refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !contractId) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh, contractId]);

  // Listen for signature changes from other components
  useEffect(() => {
    const handleSignatureChange = (event: CustomEvent) => {
      const { contractId: eventContractId } = event.detail || {};
      if (eventContractId === contractId) {
        refresh();
      }
    };

    window.addEventListener(
      "signatureStateChanged",
      handleSignatureChange as EventListener
    );
    return () => {
      window.removeEventListener(
        "signatureStateChanged",
        handleSignatureChange as EventListener
      );
    };
  }, [contractId, refresh]);

  return {
    signatureState,
    canEdit,
    reason,
    isLoading: signatureState.isLoading,
    refresh,
    invalidateCache,
  };
}

/**
 * Simplified hook for just checking if a contract can be edited
 */
export function useCanEditContract(contractId: string): {
  canEdit: boolean;
  reason?: string;
  isLoading: boolean;
} {
  const { canEdit, reason, isLoading } = useSignatureState({
    contractId,
    autoRefresh: false, // Don't auto-refresh for simple checks
  });

  return { canEdit, reason, isLoading };
}
