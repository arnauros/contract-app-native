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
              name: invoiceData.from?.name || "",
              email: invoiceData.from?.email || "",
              company: invoiceData.from?.company || "",
              address: invoiceData.from?.address || "",
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
      } catch (e) {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/Invoices/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Edit Invoice</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Invoice title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, issueDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="contractId">Linked Contract</Label>
              <Select
                value={formData.contractId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    contractId: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contract (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contract linked</SelectItem>
                  {contracts.map((contract) => {
                    const createdDate =
                      contract.createdAt?.toDate?.() ||
                      new Date(contract.createdAt);
                    const statusColor =
                      (
                        {
                          draft: "text-gray-500",
                          pending: "text-yellow-600",
                          signed: "text-green-600",
                          expired: "text-red-500",
                          declined: "text-red-500",
                        } as Record<string, string>
                      )[contract.status] || "text-gray-500";

                    return (
                      <SelectItem key={contract.id} value={contract.id}>
                        <div className="flex flex-col items-start">
                          <div className="font-medium">
                            {contract.title ||
                              `Contract ${contract.id.slice(0, 8)}`}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span className={`capitalize ${statusColor}`}>
                              {contract.status || "draft"}
                            </span>
                            <span>•</span>
                            <span>{createdDate.toLocaleDateString()}</span>
                            {contract.clientName && (
                              <>
                                <span>•</span>
                                <span>{contract.clientName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Link this invoice to a specific contract for better organization
              </p>
              {formData.contractId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(`/Contracts/${formData.contractId}`)
                  }
                  className="mt-2"
                >
                  View Contract
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Name</Label>
              <Input
                id="clientName"
                value={formData.client.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    client: { ...formData.client, name: e.target.value },
                  })
                }
                placeholder="Client name"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.client.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    client: { ...formData.client, email: e.target.value },
                  })
                }
                placeholder="client@example.com"
              />
            </div>

            <div>
              <Label htmlFor="clientCompany">Company</Label>
              <Input
                id="clientCompany"
                value={formData.client.company}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    client: { ...formData.client, company: e.target.value },
                  })
                }
                placeholder="Company name"
              />
            </div>

            <div>
              <Label htmlFor="clientAddress">Address</Label>
              <Textarea
                id="clientAddress"
                value={formData.client.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    client: { ...formData.client, address: e.target.value },
                  })
                }
                placeholder="Client address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* From Information */}
        <Card>
          <CardHeader>
            <CardTitle>From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fromName">Name</Label>
              <Input
                id="fromName"
                value={formData.from.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    from: { ...formData.from, name: e.target.value },
                  })
                }
                placeholder="Your name"
              />
            </div>

            <div>
              <Label htmlFor="fromEmail">Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={formData.from.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    from: { ...formData.from, email: e.target.value },
                  })
                }
                placeholder="your@email.com"
              />
            </div>

            <div>
              <Label htmlFor="fromCompany">Company</Label>
              <Input
                id="fromCompany"
                value={formData.from.company}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    from: { ...formData.from, company: e.target.value },
                  })
                }
                placeholder="Your company"
              />
            </div>

            <div>
              <Label htmlFor="fromAddress">Address</Label>
              <Textarea
                id="fromAddress"
                value={formData.from.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    from: { ...formData.from, address: e.target.value },
                  })
                }
                placeholder="Your address"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    placeholder="Item description"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>

                <div className="col-span-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>

                <div className="col-span-2">
                  <Label>Total</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.total}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>

                <div className="col-span-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: formData.currency,
                }).format(formData.subtotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="tax">Tax:</Label>
                <Input
                  id="tax"
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
                  className="w-24"
                />
              </div>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: formData.currency,
                }).format(formData.tax)}
              </span>
            </div>

            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total:</span>
              <span>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: formData.currency,
                }).format(formData.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Additional notes or terms..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
