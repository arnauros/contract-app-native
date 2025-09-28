"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInvoice } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = (params as any) || {};

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (!id) return;
        const res = await getInvoice(String(id));
        if ((res as any).error) {
          toast.error((res as any).error);
        } else {
          setInvoice((res as any).invoice);
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
        <h1 className="text-2xl font-semibold">{invoice.title || "Invoice"}</h1>
        <div className="text-sm text-gray-500">Status: {invoice.status}</div>
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
