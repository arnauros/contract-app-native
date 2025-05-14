import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getContract } from "@/lib/firebase/firestore";
import { validateContractToken } from "@/lib/firebase/token";
import { Contract } from "@/lib/firebase/types";

export default function PublicContractPage() {
  const router = useRouter();
  const { id, token } = router.query;
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setError("Missing contract ID or token");
      setLoading(false);
      return;
    }

    async function loadContract() {
      try {
        console.log(`Loading contract ${id} with token ${token}`);
        const result = await getContract(id as string);

        if (result.error) {
          throw new Error(result.error);
        }

        if (!result.contract) {
          throw new Error("Contract not found");
        }

        setContract(result.contract);
      } catch (err: any) {
        console.error("Error loading contract:", err);
        setError(err.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    loadContract();
  }, [id, token]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!contract) {
    return <div>Contract not found</div>;
  }

  return (
    <div>
      <h1>{contract.title || "Contract"}</h1>
      <pre>{JSON.stringify(contract, null, 2)}</pre>
    </div>
  );
}
