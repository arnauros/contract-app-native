"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInvoice,
  updateInvoice,
  getUserContracts,
} from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceFormData {
  title: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  currency: string;
  client: {
    name: string;
    email: string;
    company: string;
    address: string;
  };
  from: {
    name: string;
    email: string;
    company: string;
    address: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  contractId?: string;
}

export default function InvoiceEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = (params as any) || {};

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    title: "",
    status: "draft",
    issueDate: "",
    dueDate: "",
    currency: "USD",
    client: {
      name: "",
      email: "",
      company: "",
      address: "",
    },
    from: {
      name: "",
      email: "",
      company: "",
      address: "",
    },
    items: [
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: "",
    contractId: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        if (!id || !user) return;

        // Load invoice data
        const res = await getInvoice(String(id));
        if ((res as any).error) {
          toast.error((res as any).error);
        } else {
          const invoiceData = (res as any).invoice;
          setInvoice(invoiceData);

          // Load user settings to populate "from" section if empty
          let userSettings = null;
          try {
            const db = getFirestore();
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userSettings = userData.invoiceSettings || {};
            }
          } catch (error) {
            console.log("Failed to load user settings:", error);
          }

          // Populate form with existing data
          setFormData({
            title: invoiceData.title || "",
            status: invoiceData.status || "draft",
            issueDate: invoiceData.issueDate || "",
            dueDate: invoiceData.dueDate || "",
            currency: invoiceData.currency || "USD",
            client: {
              name: invoiceData.client?.name || "",
              email: invoiceData.client?.email || "",
              company: invoiceData.client?.company || "",
              address: invoiceData.client?.address || "",
            },
            from: {
              name:
                invoiceData.from?.name ||
                userSettings?.invoiceSettings?.name ||
                "",
              email:
                invoiceData.from?.email ||
                userSettings?.invoiceSettings?.email ||
                "",
              company:
                invoiceData.from?.company ||
                userSettings?.invoiceSettings?.company ||
                "",
              address:
                invoiceData.from?.address ||
                userSettings?.invoiceSettings?.address ||
                "",
            },
            items:
              invoiceData.items?.length > 0
                ? invoiceData.items
                : [
                    {
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      total: 0,
                    },
                  ],
            subtotal: invoiceData.subtotal || 0,
            tax: invoiceData.tax || 0,
            total: invoiceData.total || 0,
            notes: invoiceData.notes || "",
            contractId: invoiceData.contractId || "",
          });
        }

        // Load user contracts
        const contractsRes = await getUserContracts(user.uid);
        if ((contractsRes as any).success) {
          setContracts((contractsRes as any).contracts);
        }

        // Load user's invoice settings
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserSettings({
              contract: userData.contractSettings || {},
              invoice: userData.invoiceSettings || {},
            });
          }
        } catch (settingsError) {
          console.log("Failed to load user settings:", settingsError);
        }
      } catch (e) {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  // Listen for save event from topbar
  useEffect(() => {
    const handleSaveEvent = () => {
      handleSave();
    };

    window.addEventListener("saveInvoice", handleSaveEvent);
    return () => {
      window.removeEventListener("saveInvoice", handleSaveEvent);
    };
  }, [invoice, formData]); // Include dependencies for handleSave

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate total for this item
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].total =
        newItems[index].quantity * newItems[index].unitPrice;
    }

    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
      calculateTotals(newItems);
    }
  };

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = formData.tax;
    const total = subtotal + tax;

    setFormData((prev) => ({
      ...prev,
      subtotal,
      total,
    }));
  };

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    try {
      const updatedInvoice = {
        ...invoice,
        ...formData,
        updatedAt: new Date(),
      };

      const result = await updateInvoice(updatedInvoice);
      if ((result as any).error) {
        toast.error((result as any).error);
      } else {
        toast.success("Invoice updated successfully!");
        router.push(`/Invoices/${id}`);
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - matches preview exactly */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="text-2xl font-semibold border-none bg-transparent p-0 focus:ring-0 focus:border-gray-300"
            placeholder="Invoice title"
          />
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={formData.status}
            onValueChange={(value: any) =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-500">Status: {formData.status}</div>
        </div>
      </div>

      {/* Bill To / From - matches preview exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 text-base">Bill To</h2>
          <div className="space-y-2">
            <Input
              value={formData.client.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client: { ...formData.client, name: e.target.value },
                })
              }
              placeholder="Client name"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Input
              value={formData.client.company}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client: { ...formData.client, company: e.target.value },
                })
              }
              placeholder="Company name"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Input
              value={formData.client.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client: { ...formData.client, email: e.target.value },
                })
              }
              placeholder="client@example.com"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Textarea
              value={formData.client.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  client: { ...formData.client, address: e.target.value },
                })
              }
              placeholder="Client address"
              className="border-0 bg-transparent p-0 h-auto text-sm text-gray-700 resize-none focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
              rows={3}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 text-base">From</h2>
          <div className="space-y-2">
            <Input
              value={formData.from.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  from: { ...formData.from, name: e.target.value },
                })
              }
              placeholder="Your name"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Input
              value={formData.from.company}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  from: { ...formData.from, company: e.target.value },
                })
              }
              placeholder="Your company"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Input
              value={formData.from.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  from: { ...formData.from, email: e.target.value },
                })
              }
              placeholder="your@email.com"
              className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            />
            <Textarea
              value={formData.from.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  from: { ...formData.from, address: e.target.value },
                })
              }
              placeholder="Your address"
              className="border-0 bg-transparent p-0 h-auto text-sm text-gray-700 resize-none focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Invoice Items Table - matches preview exactly */}
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
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {formData.items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2">
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(idx, "description", e.target.value)
                    }
                    placeholder="Item description"
                    className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors w-16 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors w-20 text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-sm text-gray-700">
                    {new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: formData.currency || "USD",
                    }).format(item.total || 0)}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    disabled={formData.items.length === 1}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <Button onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Totals - matches preview exactly */}
      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span>Subtotal:</span>
          <span>
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: formData.currency || "USD",
            }).format(formData.subtotal || 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Tax:</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.tax}
            onChange={(e) => {
              const tax = parseFloat(e.target.value) || 0;
              setFormData({
                ...formData,
                tax,
                total: formData.subtotal + tax,
              });
            }}
            className="w-20 border-0 bg-transparent p-0 h-6 text-sm text-gray-700 focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors text-right"
          />
          <span>
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: formData.currency || "USD",
            }).format(formData.tax || 0)}
          </span>
        </div>
        <div className="font-medium">
          Total:{" "}
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: formData.currency || "USD",
          }).format(formData.total || 0)}
        </div>
      </div>

      {/* Notes - matches preview exactly */}
      <div>
        <h3 className="font-medium mb-1">Notes</h3>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes or terms..."
          className="border-0 bg-transparent p-0 h-auto text-sm text-gray-700 resize-none focus:ring-0 focus:border-transparent hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
          rows={3}
        />
      </div>

      {/* Payment Information from Settings */}
      {userSettings?.invoice && (
        <div>
          <h3 className="font-medium mb-2">Payment Information</h3>
          <div className="text-sm text-gray-700 space-y-1">
            {userSettings.invoice.iban && (
              <p>
                <strong>IBAN:</strong> {userSettings.invoice.iban}
              </p>
            )}
            {userSettings.invoice.bankName && (
              <p>
                <strong>Bank:</strong> {userSettings.invoice.bankName}
              </p>
            )}
            {userSettings.invoice.bicSwift && (
              <p>
                <strong>BIC/SWIFT:</strong> {userSettings.invoice.bicSwift}
              </p>
            )}
            {userSettings.invoice.taxId && (
              <p>
                <strong>Tax ID:</strong> {userSettings.invoice.taxId}
              </p>
            )}
            {userSettings.invoice.paymentTerms && (
              <p>
                <strong>Payment Terms:</strong>{" "}
                {userSettings.invoice.paymentTerms === "net30"
                  ? "Net 30 days"
                  : userSettings.invoice.paymentTerms === "net15"
                    ? "Net 15 days"
                    : userSettings.invoice.paymentTerms === "net7"
                      ? "Net 7 days"
                      : userSettings.invoice.paymentTerms === "due_on_receipt"
                        ? "Due on receipt"
                        : userSettings.invoice.paymentTerms}
              </p>
            )}
          </div>
          {formData.status === "draft" && (
            <p className="text-xs text-blue-600 mt-2">
              💡 This payment information is pulled from your settings and will
              update automatically.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
