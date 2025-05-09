"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/hooks/useAuth";
import { loadStripe } from "@stripe/stripe-js";
import { db } from "../lib/firebase/firebase";
import { addDoc, collection } from "firebase/firestore";

export default function StripeCheckoutButton() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    if (!user) {
      setError("You must be logged in to subscribe");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Error during checkout:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={isLoading || !user}
        className={`${
          isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
        } text-white font-bold py-2 px-4 rounded flex items-center justify-center`}
      >
        {isLoading ? "Loading..." : "Subscribe Now"}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      {!user && (
        <p className="text-gray-500 mt-2 text-sm">Please log in to subscribe</p>
      )}
    </div>
  );
}
