import { getFunctions, httpsCallable } from "firebase/functions";
import Button from "./button";
import { toast } from "react-hot-toast";
import { useState } from "react";

export default function SendContractPanel() {
  const [isSending, setIsSending] = useState(false);

  const handleTestEmail = async () => {
    try {
      setIsSending(true);
      const functions = getFunctions();
      const sendTestEmail = httpsCallable(functions, "sendTestEmail");

      console.log("Sending test email...");
      const result = await sendTestEmail({
        to: "arnauros2@gmail.com",
        subject: "Test Email from Contract App",
        message: "This is a test email sent from the contract application.",
      });

      console.log("Email result:", result);
      toast.success("Test email sent successfully!");
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Send Contract</h2>
      <div className="space-y-4">
        <Button
          onClick={handleTestEmail}
          className="w-full"
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send Test Email"}
        </Button>
        <p className="text-sm text-gray-500 text-center">
          This will send a test email to verify the email functionality
        </p>
      </div>
    </div>
  );
}
