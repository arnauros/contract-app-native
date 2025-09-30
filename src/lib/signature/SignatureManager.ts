import {
  getSignatures,
  saveSignature,
  removeSignature,
} from "@/lib/firebase/firestore";

export interface SignatureState {
  hasDesignerSignature: boolean;
  hasClientSignature: boolean;
  designerSignature: any;
  clientSignature: any;
  isLoading: boolean;
  lastChecked: number;
}

export interface SignatureCheckResult {
  canEdit: boolean;
  reason?: string;
  signatureState: SignatureState;
}

class SignatureManager {
  private static instance: SignatureManager;
  private cache = new Map<string, SignatureState>();
  private readonly CACHE_DURATION = 5000; // 5 seconds cache

  static getInstance(): SignatureManager {
    if (!SignatureManager.instance) {
      SignatureManager.instance = new SignatureManager();
    }
    return SignatureManager.instance;
  }

  /**
   * Check if a contract can be edited based on signature status
   */
  async canEditContract(contractId: string): Promise<SignatureCheckResult> {
    const signatureState = await this.getSignatureState(contractId);

    // Can edit if no designer signature exists
    const canEdit = !signatureState.hasDesignerSignature;

    return {
      canEdit,
      reason: canEdit
        ? undefined
        : "Contract is signed and cannot be edited without removing signature first",
      signatureState,
    };
  }

  /**
   * Get current signature state for a contract
   */
  async getSignatureState(contractId: string): Promise<SignatureState> {
    // Check cache first
    const cached = this.cache.get(contractId);
    if (cached && Date.now() - cached.lastChecked < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Check localStorage first (fast)
      const localDesignerSig = localStorage.getItem(
        `contract-designer-signature-${contractId}`
      );
      const localClientSig = localStorage.getItem(
        `contract-client-signature-${contractId}`
      );

      let hasLocalDesigner = !!localDesignerSig;
      let hasLocalClient = !!localClientSig;
      let designerSignature = null;
      let clientSignature = null;

      // Parse localStorage signatures if they exist
      if (hasLocalDesigner) {
        try {
          designerSignature = JSON.parse(localDesignerSig!);
        } catch (e) {
          console.warn("Invalid designer signature in localStorage:", e);
          hasLocalDesigner = false;
        }
      }

      if (hasLocalClient) {
        try {
          clientSignature = JSON.parse(localClientSig!);
        } catch (e) {
          console.warn("Invalid client signature in localStorage:", e);
          hasLocalClient = false;
        }
      }

      // Always check Firestore for authoritative state
      const firestoreResult = await getSignatures(contractId);

      if (firestoreResult.success) {
        const { designer, client } = firestoreResult.signatures;

        // Firestore is authoritative - use its data
        const signatureState: SignatureState = {
          hasDesignerSignature: !!designer?.signature,
          hasClientSignature: !!client?.signature,
          designerSignature: designer || null,
          clientSignature: client || null,
          isLoading: false,
          lastChecked: Date.now(),
        };

        // Update localStorage to match Firestore
        if (designer?.signature) {
          localStorage.setItem(
            `contract-designer-signature-${contractId}`,
            JSON.stringify(designer)
          );
        } else {
          localStorage.removeItem(`contract-designer-signature-${contractId}`);
        }

        if (client?.signature) {
          localStorage.setItem(
            `contract-client-signature-${contractId}`,
            JSON.stringify(client)
          );
        } else {
          localStorage.removeItem(`contract-client-signature-${contractId}`);
        }

        // Cache the result
        this.cache.set(contractId, signatureState);
        return signatureState;
      } else {
        // Fallback to localStorage if Firestore fails
        console.warn(
          "Firestore signature check failed, using localStorage:",
          firestoreResult.error
        );

        const signatureState: SignatureState = {
          hasDesignerSignature: hasLocalDesigner,
          hasClientSignature: hasLocalClient,
          designerSignature,
          clientSignature,
          isLoading: false,
          lastChecked: Date.now(),
        };

        this.cache.set(contractId, signatureState);
        return signatureState;
      }
    } catch (error) {
      console.error("Error checking signatures:", error);

      // Return safe fallback state
      const signatureState: SignatureState = {
        hasDesignerSignature: false,
        hasClientSignature: false,
        designerSignature: null,
        clientSignature: null,
        isLoading: false,
        lastChecked: Date.now(),
      };

      this.cache.set(contractId, signatureState);
      return signatureState;
    }
  }

  /**
   * Invalidate cache for a contract (call after signature changes)
   */
  invalidateCache(contractId: string): void {
    this.cache.delete(contractId);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Save a signature and update state
   */
  async saveSignature(
    contractId: string,
    signatureType: "designer" | "client",
    signatureData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Save to Firestore
      const result = await saveSignature(
        contractId,
        signatureType,
        signatureData
      );
      if (result.error) {
        return { success: false, error: result.error };
      }

      // Invalidate cache to force fresh state
      this.invalidateCache(contractId);

      // Update localStorage
      const key = `contract-${signatureType}-signature-${contractId}`;
      localStorage.setItem(key, JSON.stringify(signatureData));

      return { success: true };
    } catch (error) {
      console.error("Error saving signature:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Remove a signature and update state
   */
  async removeSignature(
    contractId: string,
    signatureType: "designer" | "client"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from Firestore
      const result = await removeSignature(contractId, signatureType);
      if (result.error) {
        return { success: false, error: result.error };
      }

      // Invalidate cache to force fresh state
      this.invalidateCache(contractId);

      // Remove from localStorage
      const key = `contract-${signatureType}-signature-${contractId}`;
      localStorage.removeItem(key);

      return { success: true };
    } catch (error) {
      console.error("Error removing signature:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update signature state after a signature operation
   */
  updateSignatureState(
    contractId: string,
    signatureData: Partial<SignatureState>
  ): void {
    const current = this.cache.get(contractId);
    const updated: SignatureState = {
      hasDesignerSignature: false,
      hasClientSignature: false,
      designerSignature: null,
      clientSignature: null,
      isLoading: false,
      lastChecked: Date.now(),
      ...current,
      ...signatureData,
    };

    this.cache.set(contractId, updated);
  }
}

// Export singleton instance
export const signatureManager = SignatureManager.getInstance();

// Export convenience functions
export const canEditContract = (contractId: string) =>
  signatureManager.canEditContract(contractId);
export const getSignatureState = (contractId: string) =>
  signatureManager.getSignatureState(contractId);
export const invalidateSignatureCache = (contractId: string) =>
  signatureManager.invalidateCache(contractId);
export const saveSignatureToManager = (
  contractId: string,
  signatureType: "designer" | "client",
  signatureData: any
) => signatureManager.saveSignature(contractId, signatureType, signatureData);
export const removeSignatureFromManager = (
  contractId: string,
  signatureType: "designer" | "client"
) => signatureManager.removeSignature(contractId, signatureType);
