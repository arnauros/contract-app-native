import { getFirestore, doc, getDoc } from "firebase/firestore";

export interface NotificationData {
  to: string;
  recipientName: string;
  signerName: string;
  contractId: string;
  contractTitle?: string;
  notificationType: "designer_signed" | "client_signed" | "contract_complete";
}

/**
 * Send email notification for signature events
 */
export async function sendSignatureNotification(
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📧 Sending signature notification:", data);

    const response = await fetch("/api/sendNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Notification API error:", result);
      return {
        success: false,
        error: result.error || "Failed to send notification",
      };
    }

    console.log("✅ Notification sent successfully:", result);
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get designer email from contract data or current user
 */
export async function getDesignerEmail(
  contractId: string
): Promise<string | null> {
  try {
    const firestore = getFirestore();
    const contractRef = doc(firestore, "contracts", contractId);
    const contractDoc = await getDoc(contractRef);

    if (contractDoc.exists()) {
      const contractData = contractDoc.data();
      
      // First try to get designer email from contract data
      if (contractData.designerEmail) {
        return contractData.designerEmail;
      }
      
      // If not found, try to get from current user
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      if (auth.currentUser?.email) {
        return auth.currentUser.email;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting designer email:", error);
    return null;
  }
}

/**
 * Get client email from contract data
 */
export async function getClientEmail(
  contractId: string
): Promise<string | null> {
  try {
    const firestore = getFirestore();
    const contractRef = doc(firestore, "contracts", contractId);
    const contractDoc = await getDoc(contractRef);

    if (contractDoc.exists()) {
      const contractData = contractDoc.data();
      return contractData.recipientEmail || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting client email:", error);
    return null;
  }
}

/**
 * Get contract title from contract data
 */
export async function getContractTitle(contractId: string): Promise<string> {
  try {
    const firestore = getFirestore();
    const contractRef = doc(firestore, "contracts", contractId);
    const contractDoc = await getDoc(contractRef);

    if (contractDoc.exists()) {
      const contractData = contractDoc.data();
      return contractData.title || "Contract";
    }

    return "Contract";
  } catch (error) {
    console.error("Error getting contract title:", error);
    return "Contract";
  }
}

/**
 * Send notification when designer signs contract
 */
export async function notifyClientDesignerSigned(
  contractId: string,
  designerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const clientEmail = await getClientEmail(contractId);
    if (!clientEmail) {
      console.warn("No client email found for contract:", contractId);
      return { success: false, error: "No client email found" };
    }

    const contractTitle = await getContractTitle(contractId);

    return await sendSignatureNotification({
      to: clientEmail,
      recipientName: "Client", // We don't have client name in contract data
      signerName: designerName,
      contractId,
      contractTitle,
      notificationType: "designer_signed",
    });
  } catch (error) {
    console.error("Error notifying client about designer signature:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send notification when client signs contract
 */
export async function notifyDesignerClientSigned(
  contractId: string,
  clientName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const designerEmail = await getDesignerEmail(contractId);
    if (!designerEmail) {
      console.warn("No designer email found for contract:", contractId);
      return { success: false, error: "No designer email found" };
    }

    const contractTitle = await getContractTitle(contractId);

    return await sendSignatureNotification({
      to: designerEmail,
      recipientName: "Designer", // We don't have designer name in contract data
      signerName: clientName,
      contractId,
      contractTitle,
      notificationType: "client_signed",
    });
  } catch (error) {
    console.error("Error notifying designer about client signature:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send notification when both signatures are complete
 */
export async function notifyContractComplete(
  contractId: string,
  designerName: string,
  clientName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const designerEmail = await getDesignerEmail(contractId);
    const clientEmail = await getClientEmail(contractId);
    const contractTitle = await getContractTitle(contractId);

    const results = [];

    // Notify designer
    if (designerEmail) {
      const designerResult = await sendSignatureNotification({
        to: designerEmail,
        recipientName: "Designer",
        signerName: `${designerName} & ${clientName}`,
        contractId,
        contractTitle,
        notificationType: "contract_complete",
      });
      results.push(designerResult);
    }

    // Notify client
    if (clientEmail) {
      const clientResult = await sendSignatureNotification({
        to: clientEmail,
        recipientName: "Client",
        signerName: `${designerName} & ${clientName}`,
        contractId,
        contractTitle,
        notificationType: "contract_complete",
      });
      results.push(clientResult);
    }

    // Check if any notifications failed
    const failedResults = results.filter((result) => !result.success);
    if (failedResults.length > 0) {
      return {
        success: false,
        error: `Some notifications failed: ${failedResults
          .map((r) => r.error)
          .join(", ")}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error notifying about contract completion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
