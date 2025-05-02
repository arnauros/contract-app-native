// Export Firebase initialization and instances
export { initFirebase } from "./init";
import { getFirestore } from "firebase/firestore";
import { initFirebase } from "./init";

// Initialize Firebase and export instances
const app = initFirebase();
export const db = getFirestore(app);

// Export other Firebase-related functionality
export * from "./auth";
export * from "./firestore";
export * from "./types";
