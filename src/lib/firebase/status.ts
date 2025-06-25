import { db } from "./firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Contract } from "./types";

export type ContractStatus =
  | "draft"
  | "pending"
  | "signed"
  | "expired"
  | "declined";

interface StatusUpdate {
  status: ContractStatus;
  timestamp: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    lastActivity?: string;
  };
}

/**
 * Centralized contract status management
 * Handles consistency between localStorage and Firestore
 */
export class ContractStatusManager {
  private contractId: string;

  constructor(contractId: string) {
    this.contractId = contractId;
  }

  /**
   * Get current contract status from both localStorage and Firestore
   * Returns the most recent status
   */
  async getStatus(): Promise<{
    status: ContractStatus;
    source: "localStorage" | "firestore" | "default";
    lastUpdated?: string;
  }> {
    try {
      // Check localStorage first (faster)
      const localStatus = this.getLocalStatus();

      // Check Firestore for authoritative status
      const firestoreStatus = await this.getFirestoreStatus();

      // If we have both, use the more recent one
      if (localStatus && firestoreStatus) {
        const localTime = new Date(localStatus.lastUpdated || 0).getTime();
        const firestoreTime = new Date(
          firestoreStatus.lastUpdated || 0
        ).getTime();

        if (localTime > firestoreTime) {
          // Local is newer, sync to Firestore
          await this.syncToFirestore(localStatus.status);
          return localStatus;
        } else {
          // Firestore is newer, sync to localStorage
          this.syncToLocal(firestoreStatus.status);
          return firestoreStatus;
        }
      }

      // Return whichever we have
      return (
        firestoreStatus || localStatus || { status: "draft", source: "default" }
      );
    } catch (error) {
      console.error("Error getting contract status:", error);
      // Fallback to localStorage or default
      return this.getLocalStatus() || { status: "draft", source: "default" };
    }
  }

  /**
   * Update contract status in both localStorage and Firestore
   */
  async updateStatus(
    status: ContractStatus,
    metadata?: StatusUpdate["metadata"]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date().toISOString();

      // Update localStorage immediately for responsive UI
      this.syncToLocal(status, timestamp);

      // Update Firestore (may fail due to network)
      await this.syncToFirestore(status, metadata);

      return { success: true };
    } catch (error) {
      console.error("Error updating contract status:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update status",
      };
    }
  }

  /**
   * Force sync status from Firestore to localStorage
   */
  async syncFromFirestore(): Promise<void> {
    try {
      const firestoreStatus = await this.getFirestoreStatus();
      if (firestoreStatus) {
        this.syncToLocal(firestoreStatus.status, firestoreStatus.lastUpdated);
      }
    } catch (error) {
      console.error("Error syncing from Firestore:", error);
    }
  }

  /**
   * Force sync status from localStorage to Firestore
   */
  async syncToFirestore(
    status?: ContractStatus,
    metadata?: StatusUpdate["metadata"]
  ): Promise<void> {
    try {
      if (!db) throw new Error("Firestore not initialized");

      const statusToSync = status || this.getLocalStatus()?.status;
      if (!statusToSync) return;

      const contractRef = doc(db, "contracts", this.contractId);
      const updateData: any = {
        status: statusToSync,
        updatedAt: new Date().toISOString(),
      };

      if (metadata) {
        updateData.metadata = {
          ...metadata,
          lastActivity: new Date().toISOString(),
        };
      }

      await updateDoc(contractRef, updateData);
      console.log(`✅ Synced status "${statusToSync}" to Firestore`);
    } catch (error) {
      console.error("Error syncing to Firestore:", error);
      throw error;
    }
  }

  /**
   * Get status from localStorage
   */
  private getLocalStatus(): {
    status: ContractStatus;
    source: "localStorage";
    lastUpdated: string;
  } | null {
    try {
      const stored = localStorage.getItem(`contract-status-${this.contractId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          status: parsed.status || "draft",
          source: "localStorage",
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return null;
  }

  /**
   * Get status from Firestore
   */
  private async getFirestoreStatus(): Promise<{
    status: ContractStatus;
    source: "firestore";
    lastUpdated: string;
  } | null> {
    try {
      if (!db) return null;

      const contractRef = doc(db, "contracts", this.contractId);
      const contractDoc = await getDoc(contractRef);

      if (contractDoc.exists()) {
        const data = contractDoc.data();
        return {
          status: data.status || "draft",
          source: "firestore",
          lastUpdated: data.updatedAt || new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error("Error reading from Firestore:", error);
    }
    return null;
  }

  /**
   * Sync status to localStorage
   */
  private syncToLocal(status: ContractStatus, timestamp?: string): void {
    try {
      const statusData = {
        status,
        lastUpdated: timestamp || new Date().toISOString(),
      };

      localStorage.setItem(
        `contract-status-${this.contractId}`,
        JSON.stringify(statusData)
      );

      console.log(`✅ Synced status "${status}" to localStorage`);
    } catch (error) {
      console.error("Error syncing to localStorage:", error);
    }
  }

  /**
   * Clear all status data for this contract
   */
  clearStatus(): void {
    try {
      localStorage.removeItem(`contract-status-${this.contractId}`);
    } catch (error) {
      console.error("Error clearing status:", error);
    }
  }
}

/**
 * Helper function to get a status manager instance
 */
export function getStatusManager(contractId: string): ContractStatusManager {
  return new ContractStatusManager(contractId);
}

/**
 * Hook for React components to use contract status
 */
export function useContractStatus(contractId: string) {
  const statusManager = new ContractStatusManager(contractId);

  return {
    getStatus: () => statusManager.getStatus(),
    updateStatus: (
      status: ContractStatus,
      metadata?: StatusUpdate["metadata"]
    ) => statusManager.updateStatus(status, metadata),
    syncFromFirestore: () => statusManager.syncFromFirestore(),
    clearStatus: () => statusManager.clearStatus(),
  };
}
