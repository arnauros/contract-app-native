import { db } from "./config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// Contracts
export const createContract = async (userId: string, contractData: any) => {
  try {
    const docRef = await addDoc(collection(db, "contracts"), {
      ...contractData,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "draft",
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    console.error("Error creating contract:", error);
    return { id: null, error: error.message };
  }
};

export const getContract = async (contractId: string) => {
  try {
    const contractRef = doc(db, "contracts", contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      return { contract: null, error: "Contract not found" };
    }

    return {
      contract: { id: contractSnap.id, ...contractSnap.data() },
      error: null,
    };
  } catch (error) {
    console.error("Error getting contract:", error);
    return { contract: null, error: error.message };
  }
};

export const getUserContracts = async (userId: string) => {
  try {
    const q = query(collection(db, "contracts"), where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    const contracts = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { contracts, error: null };
  } catch (error) {
    console.error("Error getting user contracts:", error);
    return { contracts: [], error: error.message };
  }
};

export const updateContract = async (contractId: string, updates: any) => {
  try {
    const contractRef = doc(db, "contracts", contractId);
    await updateDoc(contractRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    console.error("Error updating contract:", error);
    return { error: error.message };
  }
};
