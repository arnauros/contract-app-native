export default function MockInvoicePage() {
  return (
    <div className="p-6 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoice</h1>
          <p className="text-sm text-gray-500">Invoice #INV-0001</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Status</div>
          <span className="inline-flex text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700">
            draft
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="font-medium">Bill To</h2>
          <div className="text-sm text-gray-700">
            <div>Jane Client</div>
            <div>ClientCo LLC</div>
            <div>jane.client@example.com</div>
            <div className="whitespace-pre-line">
              123 Market Street\nSan Francisco, CA 94103
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-medium">From</h2>
          <div className="text-sm text-gray-700">
            <div>John Freelancer</div>
            <div>Freelance Studio</div>
            <div>john.freelancer@example.com</div>
            <div className="whitespace-pre-line">
              987 Mission Street\nSan Francisco, CA 94110
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto">
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
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">
                Project discovery and requirements workshop
              </td>
              <td className="px-4 py-3 text-sm text-right">1</td>
              <td className="px-4 py-3 text-sm text-right">$500.00</td>
              <td className="px-4 py-3 text-sm text-right">$500.00</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">
                UI design for homepage and dashboard
              </td>
              <td className="px-4 py-3 text-sm text-right">8</td>
              <td className="px-4 py-3 text-sm text-right">$75.00</td>
              <td className="px-4 py-3 text-sm text-right">$600.00</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">
                Implementation and integration (Next.js + Firebase)
              </td>
              <td className="px-4 py-3 text-sm text-right">12</td>
              <td className="px-4 py-3 text-sm text-right">$90.00</td>
              <td className="px-4 py-3 text-sm text-right">$1,080.00</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-col items-end gap-1 text-sm">
        <div>Subtotal: $2,180.00</div>
        <div>Tax (8%): $174.40</div>
        <div className="font-medium">Total: $2,354.40</div>
        <div className="text-xs text-gray-500">Currency: USD</div>
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Notes</h3>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          Thank you for your business! Payment due within 14 days.\nLate
          payments may be subject to a 2% monthly fee.
        </p>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
          type="button"
        >
          Download PDF
        </button>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          type="button"
        >
          Send Invoice
        </button>
      </section>
    </div>
  );
}
