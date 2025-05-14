"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getContract } from "@/lib/firebase/firestore";
import {
  validateContractToken,
  ContractAccessError,
} from "@/lib/firebase/token";
import { Contract } from "@/lib/firebase/types";

export default function PublicContractViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("\n\n====== PUBLIC CONTRACT VIEW PAGE ======");
    console.log(`Contract ID: ${id}`);
    console.log(`Token provided: ${token ? "Yes" : "No"}`);

    async function loadContract() {
      try {
        setIsLoading(true);

        if (!token) {
          console.log("No token provided");
          setError("No token provided. Please use a valid contract link.");
          setIsLoading(false);
          return;
        }

        console.log("Fetching contract from Firestore...");
        const result = await getContract(id);
        console.log("Contract fetch result:", result);

        if (result.error) {
          console.log("Error fetching contract:", result.error);
          throw new Error(result.error);
        }

        const contractData = result.contract;
        if (!contractData) {
          console.log("Contract not found");
          throw ContractAccessError.CONTRACT_NOT_FOUND;
        }

        console.log("Contract found, validating token...");
        let hasValidToken = false;
        try {
          const validation = await validateContractToken(id, token);
          hasValidToken = validation.isValid;
          console.log("Token validation result:", hasValidToken);
        } catch (error) {
          console.error("Token validation error:", error);
          throw error;
        }

        if (hasValidToken || contractData.status === "signed") {
          console.log("Access granted");
          setContract(contractData);
        } else {
          console.log("Invalid token and contract not signed");
          throw ContractAccessError.TOKEN_INVALID;
        }
      } catch (error: any) {
        console.error("Error loading contract:", error);
        setError(error?.message || "Failed to load contract");
      } finally {
        setIsLoading(false);
        console.log(
          "====== PUBLIC CONTRACT VIEW PAGE LOAD COMPLETE ======\n\n"
        );
      }
    }

    if (id) {
      loadContract();
    }
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-medium mb-4">Loading contract...</h2>
          <div className="animate-pulse h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="animate-pulse h-4 w-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-medium text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-medium text-red-600 mb-2">
            Contract Not Found
          </h2>
          <p className="text-gray-700">
            The contract you're looking for could not be found or you don't have
            permission to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">
          {contract.title || "Contract"}
        </h1>
        <div className="prose max-w-none">
          <pre className="p-4 bg-gray-100 rounded-lg overflow-x-auto">
            {JSON.stringify(contract.content, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
