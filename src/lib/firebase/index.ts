// Export Firebase initialization and instances
import { app, db, auth, initFirebase } from "./firebase";

// Re-export Firebase instances
export { app, db, auth, initFirebase };

// Export other Firebase-related functionality
export * from "./firestore";
export type { Contract, ViewTracking, ContractAudit, Signature, ButtonProps, ContractAccessErrorType } from "./types";
