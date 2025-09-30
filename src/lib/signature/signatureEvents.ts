/**
 * Centralized event system for signature state changes
 * All components should use these events to stay in sync
 */

export interface SignatureChangeEvent {
  contractId: string;
  hasDesignerSignature: boolean;
  hasClientSignature: boolean;
  source: string;
}

/**
 * Dispatch a signature state change event
 * This notifies all components that signature state has changed
 */
export function dispatchSignatureChange(event: SignatureChangeEvent): void {
  const customEvent = new CustomEvent("signatureStateChanged", {
    detail: event,
  });

  window.dispatchEvent(customEvent);
  console.log("📝 Signature state changed:", event);
}

/**
 * Dispatch an unsign request event
 * This triggers the unsign confirmation modal
 */
export function dispatchUnsignRequest(
  contractId: string,
  source: string
): void {
  const customEvent = new CustomEvent("requestUnsignPrompt", {
    detail: { contractId, source },
  });

  window.dispatchEvent(customEvent);
  console.log("🔄 Unsign request dispatched:", { contractId, source });
}

/**
 * Dispatch a signature removal completion event
 * This notifies all components that a signature was removed
 */
export function dispatchSignatureRemoved(
  contractId: string,
  source: string
): void {
  const customEvent = new CustomEvent("signatureRemoved", {
    detail: { contractId, source },
  });

  window.dispatchEvent(customEvent);
  console.log("🗑️ Signature removed:", { contractId, source });
}
