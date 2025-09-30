"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice, getContract } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Edit, ArrowLeft } from "lucide-react";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = (params as any) || {};

  const [invoice, setInvoice] = useState<any | null>(null);
  const [contract, setContract] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const res = await getInvoice(String(id));
        if ((res as any).error) {
          toast.error((res as any).error);
        } else {
          const invoiceData = (res as any).invoice;
          setInvoice(invoiceData);

          // Load contract details if linked
          if (invoiceData.contractId) {
            try {
              const contractRes = await getContract(invoiceData.contractId);
              if ((contractRes as any).success) {
                setContract((contractRes as any).contract);
              }
            } catch (contractError) {
              console.log("Failed to load contract details:", contractError);
            }
          }
        }
      } catch (e) {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  if (loading) {
    return <div className="p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-semibold">
            {invoice.title || "Invoice"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">Status: {invoice.status}</div>
          <Button onClick={() => router.push(`/Invoices/${id}/edit`)} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="font-medium">Bill To</h2>
          <div className="text-sm text-gray-700">
            <div>{invoice?.client?.name}</div>
            <div>{invoice?.client?.company}</div>
            <div>{invoice?.client?.email}</div>
            <div className="whitespace-pre-line">
              {invoice?.client?.address}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-medium">From</h2>
          <div className="text-sm text-gray-700">
            <div>{invoice?.from?.name}</div>
            <div>{invoice?.from?.company}</div>
            <div>{invoice?.from?.email}</div>
            <div className="whitespace-pre-line">{invoice?.from?.address}</div>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(invoice.items || []).map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {item.description}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  {item.quantity}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: invoice.currency || "USD",
                  }).format(item.unitPrice || 0)}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: invoice.currency || "USD",
                  }).format(item.total || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-end gap-1 text-sm">
        <div>
          Subtotal:{" "}
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: invoice.currency || "USD",
          }).format(invoice.subtotal || 0)}
        </div>
        {typeof invoice.tax === "number" && (
          <div>
            Tax:{" "}
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: invoice.currency || "USD",
            }).format(invoice.tax || 0)}
          </div>
        )}
        <div className="font-medium">
          Total:{" "}
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: invoice.currency || "USD",
          }).format(invoice.total || 0)}
        </div>
      </div>
      {invoice.contractId && (
        <div>
          <h3 className="font-medium mb-1">Linked Contract</h3>
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {contract?.title ||
                    `Contract ${invoice.contractId.slice(0, 8)}`}
                </p>
                <div className="text-xs text-gray-500 mt-1 space-y-1">
                  <p>ID: {invoice.contractId}</p>
                  {contract?.status && (
                    <p className="capitalize">
                      Status:{" "}
                      <span
                        className={`font-medium ${
                          contract.status === "signed"
                            ? "text-green-600"
                            : contract.status === "pending"
                            ? "text-yellow-600"
                            : contract.status === "draft"
                            ? "text-gray-500"
                            : "text-red-500"
                        }`}
                      >
                        {contract.status}
                      </span>
                    </p>
                  )}
                  {contract?.clientName && <p>Client: {contract.clientName}</p>}
                  {contract?.createdAt && (
                    <p>
                      Created:{" "}
                      {contract.createdAt.toDate?.()?.toLocaleDateString() ||
                        new Date(contract.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/Contracts/${invoice.contractId}`)}
                className="ml-4"
              >
                View Contract
              </Button>
            </div>
          </div>
        </div>
      )}

      {invoice.notes && (
        <div>
          <h3 className="font-medium mb-1">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  );
}
