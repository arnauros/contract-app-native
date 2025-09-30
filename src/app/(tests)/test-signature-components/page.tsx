"use client";

import { useState, useEffect } from "react";
import {
  useSignatureState,
  useCanEditContract,
} from "@/lib/hooks/useSignatureState";
import {
  dispatchSignatureChange,
  dispatchUnsignRequest,
  dispatchSignatureRemoved,
} from "@/lib/signature/signatureEvents";
import { saveSignature, removeSignature } from "@/lib/firebase/firestore";
import { toast } from "react-hot-toast";

export default function TestSignatureComponentsPage() {
  const [contractId] = useState("component-test-456");
  const [activeTab, setActiveTab] = useState("hooks");
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Test the hooks - only on client side
  const {
    signatureState,
    canEdit,
    reason,
    isLoading,
    refresh,
    invalidateCache,
  } = useSignatureState({
    contractId: isClient ? contractId : "",
    autoRefresh: isClient,
    refreshInterval: 3000,
  });

  const {
    canEdit: canEditSimple,
    reason: reasonSimple,
    isLoading: isLoadingSimple,
  } = useCanEditContract(isClient ? contractId : "");

  const handleSignDesigner = async () => {
    try {
      const signatureData = {
        contractId,
        userId: "test-designer-user",
        signature: "data:image/png;base64,test-designer-signature",
        name: "Test Designer",
        signedAt: new Date(),
      };
      await saveSignature(contractId, "designer", signatureData);
      invalidateCache();
      toast.success("Designer signature added");
    } catch (error) {
      toast.error("Failed to add designer signature");
    }
  };

  const handleSignClient = async () => {
    try {
      const signatureData = {
        contractId,
        userId: "test-client-user",
        signature: "data:image/png;base64,test-client-signature",
        name: "Test Client",
        signedAt: new Date(),
      };
      await saveSignature(contractId, "client", signatureData);
      invalidateCache();
      toast.success("Client signature added");
    } catch (error) {
      toast.error("Failed to add client signature");
    }
  };

  const handleRemoveDesigner = async () => {
    try {
      await removeSignature(contractId, "designer");
      invalidateCache();
      toast.success("Designer signature removed");
    } catch (error) {
      toast.error("Failed to remove designer signature");
    }
  };

  const handleRemoveClient = async () => {
    try {
      await removeSignature(contractId, "client");
      invalidateCache();
      toast.success("Client signature removed");
    } catch (error) {
      toast.error("Failed to remove client signature");
    }
  };

  const handleEventTest = (eventType: string) => {
    switch (eventType) {
      case "signatureChange":
        dispatchSignatureChange({
          contractId,
          hasDesignerSignature: !signatureState.hasDesignerSignature,
          hasClientSignature: signatureState.hasClientSignature,
          source: "component-test",
        });
        break;
      case "unsignRequest":
        dispatchUnsignRequest(contractId, "component-test");
        break;
      case "signatureRemoved":
        dispatchSignatureRemoved(contractId, "component-test");
        break;
    }
  };

  const tabs = [
    { id: "hooks", name: "Hook Testing" },
    { id: "events", name: "Event Testing" },
    { id: "signatures", name: "Signature Operations" },
    { id: "state", name: "State Display" },
  ];

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading components test...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Signature Components Test
        </h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Hook Testing Tab */}
        {activeTab === "hooks" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                useSignatureState Hook
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">State</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Loading:</span>
                      <span
                        className={
                          isLoading ? "text-yellow-600" : "text-green-600"
                        }
                      >
                        {isLoading ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Edit:</span>
                      <span
                        className={canEdit ? "text-green-600" : "text-red-600"}
                      >
                        {canEdit ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Designer Signature:</span>
                      <span
                        className={
                          signatureState.hasDesignerSignature
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        {signatureState.hasDesignerSignature ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client Signature:</span>
                      <span
                        className={
                          signatureState.hasClientSignature
                            ? "text-green-600"
                            : "text-gray-600"
                        }
                      >
                        {signatureState.hasClientSignature ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={refresh}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={invalidateCache}
                      className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                    >
                      Invalidate Cache
                    </button>
                  </div>
                </div>
              </div>
              {reason && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Reason:</strong> {reason}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                useCanEditContract Hook
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">State</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Loading:</span>
                      <span
                        className={
                          isLoadingSimple ? "text-yellow-600" : "text-green-600"
                        }
                      >
                        {isLoadingSimple ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Edit:</span>
                      <span
                        className={
                          canEditSimple ? "text-green-600" : "text-red-600"
                        }
                      >
                        {canEditSimple ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Info</h3>
                  <div className="text-sm text-gray-600">
                    <p>
                      This hook is optimized for simple edit checks without
                      auto-refresh.
                    </p>
                  </div>
                </div>
              </div>
              {reasonSimple && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Reason:</strong> {reasonSimple}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Testing Tab */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Event System Testing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleEventTest("signatureChange")}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Dispatch Signature Change
                </button>
                <button
                  onClick={() => handleEventTest("unsignRequest")}
                  className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Dispatch Unsign Request
                </button>
                <button
                  onClick={() => handleEventTest("signatureRemoved")}
                  className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Dispatch Signature Removed
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Check the browser console to see event
                  logs. These events should trigger updates in other components
                  listening for them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signature Operations Tab */}
        {activeTab === "signatures" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Signature Operations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-4">
                    Add Signatures
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleSignDesigner}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add Designer Signature
                    </button>
                    <button
                      onClick={handleSignClient}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Client Signature
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-4">
                    Remove Signatures
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleRemoveDesigner}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove Designer Signature
                    </button>
                    <button
                      onClick={handleRemoveClient}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Remove Client Signature
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State Display Tab */}
        {activeTab === "state" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Complete State Display
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">
                    Signature State
                  </h3>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(signatureState, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">
                    Hook Results
                  </h3>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(
                      {
                        canEdit,
                        reason,
                        isLoading,
                        canEditSimple,
                        reasonSimple,
                        isLoadingSimple,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">LocalStorage State</h2>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(
                  {
                    designer: localStorage.getItem(
                      `contract-designer-signature-${contractId}`
                    ),
                    client: localStorage.getItem(
                      `contract-client-signature-${contractId}`
                    ),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
