import { useState } from "react";

interface SendStageProps {
  onSend: (clientName: string, clientEmail: string) => void;
}

export function SendStage({ onSend }: SendStageProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Validate form
  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return clientName.trim().length > 0 && emailRegex.test(clientEmail);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSend(clientName, clientEmail);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Send Contract
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Your client's name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Client Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Your client's email
          </label>
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="client@email.com"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!validateForm()}
          className={`w-full py-3 px-4 rounded-lg text-white text-center font-medium ${
            validateForm()
              ? "bg-gray-900 hover:bg-gray-800"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Send Agreement
        </button>
      </div>
    </div>
  );
}
