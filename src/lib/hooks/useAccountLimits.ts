import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";

export interface AccountLimits {
  contracts: {
    current: number;
    limit: number;
    canCreate: boolean;
  };
  invoices: {
    current: number;
    limit: number;
    canCreate: boolean;
  };
  isPro: boolean;
  loading: boolean;
}

export function useAccountLimits(): AccountLimits & {
  refreshLimits: () => void;
} {
  const { user } = useAuth();
  const subscriptionStatus = useSubscription();
  const [limits, setLimits] = useState<AccountLimits>({
    contracts: { current: 0, limit: 1, canCreate: true },
    invoices: { current: 0, limit: 1, canCreate: true },
    isPro: false,
    loading: true,
  });

  const checkLimits = async () => {
    if (!user) {
      setLimits({
        contracts: { current: 0, limit: 1, canCreate: false },
        invoices: { current: 0, limit: 1, canCreate: false },
        isPro: false,
        loading: false,
      });
      return;
    }

    try {
      const db = getFirestore();
      const isPro = subscriptionStatus.isActive;

      // Check contracts count
      const contractsRef = collection(db, "contracts");
      const contractsQuery = query(
        contractsRef,
        where("userId", "==", user.uid)
      );
      const contractsSnapshot = await getDocs(contractsQuery);
      const contractsCount = contractsSnapshot.size;
      
      console.log("🔍 Contract count check:", {
        userId: user.uid,
        contractsFound: contractsSnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title })),
        contractsCount
      });

      // Check invoices count
      const invoicesRef = collection(db, "invoices");
      const invoicesQuery = query(invoicesRef, where("userId", "==", user.uid));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesCount = invoicesSnapshot.size;
      
      console.log("🔍 Invoice count check:", {
        userId: user.uid,
        invoicesFound: invoicesSnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title })),
        invoicesCount
      });

      // Set limits based on subscription status
      const contractLimit = isPro ? Infinity : 1;
      const invoiceLimit = isPro ? Infinity : 1;

      const finalLimits = {
        contracts: {
          current: contractsCount,
          limit: contractLimit,
          canCreate: isPro || contractsCount < contractLimit,
        },
        invoices: {
          current: invoicesCount,
          limit: invoiceLimit,
          canCreate: isPro || invoicesCount < invoiceLimit,
        },
        isPro,
        loading: false,
      };
      
      console.log("📊 Final account limits:", finalLimits);
      setLimits(finalLimits);
    } catch (error) {
      console.error("Error checking account limits:", error);
      setLimits((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkLimits();
  }, [user, subscriptionStatus.isActive]);

  const refreshLimits = () => {
    checkLimits();
  };

  return { ...limits, refreshLimits };
}
